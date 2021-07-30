const {admin, database} = require('./admin');

module.exports = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else{
        console.error('Token is not exist');
        return res.status(403).json({ error: 'Can not log in'});
    }

    admin.auth().verifyIdToken(idToken)
        .then((decodeToken) => {
            req.user = decodeToken;
            return database.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            req.user.name = data.docs[0].data().name;
            req.user.imgUrl = data.docs[0].data().imgUrl;
            return next();
        })
        .catch(err => {
            console.error('Can not verify token', err);
            return res.status(403).json(err);
        })
}