const {database} = require('../utility/admin');

// get posts
// https://firebase.google.com/docs/firestore/query-data/get-data
exports.getAllPosts = (req, res) =>{
    database
    .collection('posts')
    .orderBy('createDate', 'desc')
    .get().then(data => {
        let posts = [];
        data.forEach(doc =>{
            posts.push({
                postId: doc.id,
                content: doc.data().content,
                user: doc.data().user,
                createDate: doc.data().createDate,
                commentTotal: doc.data().commentTotal,
                likeTotal: doc.data().likeTotal,
                userImg: doc.data().userImg
            });
        });
        return res.json(posts);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
}

// add post
exports.postPost = (req, res) => {
    if(req.body.content.trim() === ''){
        return res.status(400).json({
            content: 'Post can not be empty'
        });
    }

    const newPost = {
        content: req.body.content,
        user: req.user.name,
        userImg: req.user.imgUrl,
        likeTotal: 0,
        commentTotal: 0,
        createDate: new Date().toISOString()
    };
    database
    .collection('posts')
    .add(newPost)
    .then(doc => {
        const returnPost = newPost;
        returnPost.postId = doc.id;
        res.json(returnPost);
    })
    .catch(err => {
        res.status(500).json({ error: 'Adding post is failed'});
        console.error(err);
    })
};

// get one post
exports.getPost = (req, res) => {
    let postData = {};
    database.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post is not exist' });
        }
        postData = doc.data();
        postData.postId = doc.id;
        return database.collection('comments').orderBy('createDate', 'desc').where('postId', '==', req.params.postId).get(); 
    })
    .then((data) => {
        postData.comments = [];
        data.forEach((doc) => {
            postData.comments.push(doc.data());
        });
        return res.json(postData);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
};

// add comment
exports.addComment = (req, res) =>{
    if (req.body.content.trim() === '')
    return res.status(400).json({ comment: 'Please, write a comment' });

    const newComment = {
        content: req.body.content,
        createDate: new Date().toISOString(),
        postId: req.params.postId,
        user: req.user.name,
        userImg: req.user.imgUrl
    };
    console.log(newComment);

    database.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post is not exist' });
        }
        return doc.ref.update({ commentTotal: doc.data().commentTotal + 1 });
    })
    .then(() => {
        return database.collection('comments').add(newComment);
    })
    .then(() => {
        res.json(newComment);
    })
    .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something wrong' });
    });
};

// like post
exports.likePost = (req, res) => {
    const likeDoc = database.collection('likes').where('user', '==', req.user.name).where('postId', '==', req.params.postId).limit(1);
    const postDoc = database.doc(`/posts/${req.params.postId}`);

    let postData;

    postDoc.get().then((doc) => {
        if (doc.exists) {
            postData = doc.data();
            postData.postId = doc.id;
            return likeDoc.get();
        } else {
            return res.status(404).json({ error: 'Post is to exist' });
        }
    })
    .then((data) => {
        if (data.empty) {
            return database .collection('likes').add({
                postId: req.params.postId,
                user: req.user.name
            })
            .then(() => {
                postData.likeTotal++;
                return postDoc.update({ likeTotal: postData.likeTotal });
            })
            .then(() => {
                return res.json(postData);
            });
        } else {
            return res.status(400).json({ error: 'You are already liked this post' });
        }
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
};

// unlike post
exports.unlikePost = (req, res) => {
    const likeDoc = database.collection('likes').where('user', '==', req.user.name).where('postId', '==', req.params.postId).limit(1);

    const postDoc = database.doc(`/posts/${req.params.postId}`);

    let postData;
    postDoc.get().then((doc) => {
        if (doc.exists) {
            postData = doc.data();
            postData.postId = doc.id;
            return likeDoc.get();
        } else {
            return res.status(404).json({ error: 'Post is to exist' });
        }
    })
    .then((data) => {
        if (data.empty) {
            return res.status(400).json({ error: 'This post doesnt has likes' });
        } else {
            return database
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
                postData.likeTotal--;
                return postDoc.update({ likeTotal: postData.likeTotal });
            })
            .then(() => {
                res.json(postData);
            });
        }
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
};

// post delete
exports.deletePost = (req, res) => {
    const document = database.doc(`/posts/${req.params.postId}`);
    document.get().then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post is not exist' });
        }
        if (doc.data().user !== req.user.name) {
            return res.status(403).json({ error: 'Please, authorized for this' });
        } else {
            return document.delete();
        }
    })
    .then(() => {
        res.json({ message: 'Post was deleted' });
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};