const {admin, database} = require('../utility/admin');

const firebaseConfig = require('../utility/firebaseConfig');

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const {validationRegistrationData, validationLoginData, smUserDat} = require('../utility/validation');
const { user } = require('firebase-functions/lib/providers/auth');

// user registration
exports.registration = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confPassword: req.body.confPassword,
        name: req.body.name
    };

    const {valid, errors} = validationRegistrationData(newUser);
    if(!valid) return res.status(400).json(errors);
    const emptyImg = 'user-image.png';

    // registration validation
    let token, userId;
    database.doc(`/users/${newUser.name}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({ name: 'this user is already exist' });
        } else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    .then(data => {
    userId = data.user.uid;
    return data.user.getIdToken();
    })
    .then((idToken) => {
        token = idToken;
        const userData = {
            name: newUser.name,
            email: newUser.email,
            imgUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${emptyImg}?alt=media`,
            createDate: new Date().toISOString(),
            userId
        };
        return database.doc(`/users/${newUser.name}`).set(userData);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({ email: "Email is already exist"});
        } else {
            return res.status(500).json({ general: 'Error: Please try again'});
        }
    });
}

// login
exports.login = (req, res) => {
    const user ={
        email: req.body.email,
        password: req.body.password
    };
    const {valid, errors} = validationLoginData(user);
    if(!valid) return res.status(400).json(errors);
    // standart firebase login function
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data =>{
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({token});
    })
    .catch(err => {
        console.error(err);
        return res.status(403).json({ general: 'Wrong email or password. Please try again'});
    })
};

// add User Data
exports.addUserDet = (req, res) =>{
    let userDet = smUserDat(req.body);

    database.doc(`/users/${req.user.name}`).update(userDet)
    .then(() => {
        return res.json({ message: 'Details was added' });
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};

// get any users data (User page)
exports.getUserData = (req, res) => {
    let userResp = {};
    database.doc(`/users/${req.params.name}`)
        .get()
        .then((doc) => {
        if (doc.exists) {
            userResp.user = doc.data();
            return database.collection("posts").where("user", "==", req.params.name).orderBy("createDate", "desc").get();
        } else {
            return res.status(404).json({ errror: "User is not exist" });
        }
        })
        .then((data) => {
        userResp.posts = [];
        data.forEach((doc) => {
            userResp.posts.push({
                userResp: doc.data().body,
                createDate: doc.data().createDate,
                user: doc.data().user,
                userImg: doc.data().userImg,
                likeTotal: doc.data().likeTotal,
                commentTotal: doc.data().commentTotal,
                postId: doc.id,
                content: doc.data().content
            });
        });
        return res.json(userResp);
        })
        .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
        });
};

// get one user Data
exports.getUserAuth = (req, res) => {
    let userResp = {};
    database.doc(`users/${req.user.name}`).get()
    .then(doc => {
        if(doc.exists){
            userResp.details = doc.data();
            return database.collection('likes').where('user', '==', req.user.name).get()
        }
    })
    .then(data => {
        userResp.likes = [];
        data.forEach(doc => {
            userResp.likes.push(doc.data());
        });
        return database.collection('notices').where('receiver', '==', req.user.name).orderBy('createDate', 'desc').limit(10).get();
    })
    .then(data => {
        userResp.notices = [];
        data.forEach(doc => {
            userResp.notices.push({
                receiver: doc.data().receiver,
                shipper: doc.data().shipper,
                postId: doc.data().postId,
                createDate: doc.data().createDate,
                type: doc.data().type,
                read: doc.data().read,
                noticeId: doc.id
            })
        });
        return res.json(userResp);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
};

// busboy (upload image)
exports.uploadImg = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imgName;
    let imgUp = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (! [ 'image/jpeg', 'image/png' ].includes( mimetype ) ) {
            return res.status(400).json({ error: "Type of file mast to be jpg/png" });
        }
        const imgExt = filename.split('.')[filename.split('.').length - 1];
        imgName = `${Math.round(Math.random() * 10000000)}.${imgExt}`;
        const imgPath = path.join(os.tmpdir(), imgName);
        imgUp = {imgPath, mimetype};
        file.pipe(fs.createWriteStream(imgPath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket(firebaseConfig.storageBucket).upload(imgUp.imgPath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imgUp.mimetype
                },
            },
        })
        .then(() => {
            const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imgName}?alt=media`;
            return database.doc(`/users/${req.user.name}`).update({imgUrl});
        })
        .then(() => {
            return res.json({message: 'Image was uploaded'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            });
        });
    });
    busboy.end(req.rawBody);
};

// Mark Notifications Opened
exports.markNoticesOpened = (req, res) => {
    let group = database.batch();
    req.body.forEach((noticeId) => {
        const notice = database.doc(`/notices/${noticeId}`);
        group.update(notice, { read: true });
    });
    group.commit()
    .then(() => {
        return res.json({ message: "Notice is readed" });
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};

// get all users
exports.getAllUsers = (req, res) =>{
    database
    .collection('users')
    .orderBy('name', 'asc')
    .get().then(data => {
        let users = [];
        data.forEach(doc =>{
            users.push({
                userId: doc.data().userId,
                email: doc.data().email,
                name: doc.data().name,
                createDate: doc.data().createDate,
                imgUrl: doc.data().imgUrl
            });
        });
        return res.json(users);
    })
    .catch(err => console.error(err));
}