const functions = require('firebase-functions');

// connect express
const express = require('express');
const application = express();

const {database} = require('./utility/admin');
const FireAuth = require('./utility/fireAuth');

const cors = require('cors');
application.use(cors());

const {getAllPosts, postPost, getPost, addComment, likePost, unlikePost, deletePost} = require('./actions/posts');

const {registration, login, uploadImg, addUserDet, getUserAuth, getUserData, markNoticesOpened, getAllUsers} = require('./actions/users');

// posts routs
// get posts
application.get('/posts', getAllPosts);
//create new post
application.post('/post', FireAuth, postPost);
// get one post
application.get('/post/:postId', getPost);
// post comment
application.post('/post/:postId/comment', FireAuth, addComment);
// post detele
application.delete('/post/:postId', FireAuth, deletePost);
// like post
application.get('/post/:postId/like', FireAuth, likePost);
// unlike post
application.get('/post/:postId/unlike', FireAuth, unlikePost);

// user routs
// user registration
application.post('/registration', registration);
// login
application.post('/login', login);
// upload image
application.post('/user/img', FireAuth, uploadImg);
// post post data
application.post('/user', FireAuth, addUserDet);
// get one user data
application.get('/user', FireAuth, getUserAuth);
application.get('/user/:name', getUserData);
// user notifications
application.post('/notices', FireAuth, markNoticesOpened);
// get all users
application.get('/users', getAllUsers);

exports.api = functions.https.onRequest(application);

// like notice
exports.likeNotice = functions.region('us-central1').firestore.document('likes/{id}').onCreate((snapshot) => {
  return database.doc(`/posts/${snapshot.data().postId}`)
  .get()
  .then((doc) => {
    if (doc.exists && doc.data().user !== snapshot.data().user) {
      return database.doc(`/notices/${snapshot.id}`).set({
        createDate: new Date().toISOString(),
        read: false,
        type: 'like',
        shipper: snapshot.data().user,
        receiver: doc.data().user,
        postId: doc.id
      });
    }
  })
  .catch((err) => 
    console.error(err)
  );
});

// unlike
exports.removeLikeNotice = functions.region('us-central1').firestore.document('likes/{id}').onDelete((snapshot) => {
  return database.doc(`/notices/${snapshot.id}`)
    .delete()
    .catch(err => {
    console.error(err);
    return;
  });
});

// comment notice
exports.commentNotice = functions.region('us-central1').firestore.document('comments/{id}').onCreate((snapshot) => {
  return database.doc(`/posts/${snapshot.data().postId}`)
  .get()
  .then((doc) => {
    if (doc.exists && doc.data().user !== snapshot.data().user) {
      return database.doc(`/notices/${snapshot.id}`).set({
        createDate: new Date().toISOString(),
        read: false,
        type: 'comment',
        shipper: snapshot.data().user,
        receiver: doc.data().user,
        postId: doc.id
      });
    }
  })
  .catch(err => {
    console.error(err);
  return;
  });
});

// if user changed profile image => post image
exports.changeUserImg = functions.region('us-central1').firestore.document('users/{id}').onUpdate((change) => {
  console.log(change.before.data());
  console.log(change.after.data());
    if (change.before.data().imgUrl !== change.after.data().imgUrl) {
      console.log('Image was changed successfully');
      const group = database.batch();
      return database
      .collection('posts')
      .where('user', '==', change.before.data().name)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          const post = database.doc(`/posts/${doc.id}`);
          group.update(post, { userImg: change.after.data().imgUrl });
        });
      return group.commit();
      });
    } else return true;
});

// if user changed profile image => comment image
exports.changeUserImgComments = functions.region('us-central1').firestore.document('users/{id}').onUpdate((change) => {
  console.log(change.before.data());
  console.log(change.after.data());
    if (change.before.data().imgUrl !== change.after.data().imgUrl) {
      console.log('Image was changed successfully');
      const group = database.batch();
      return database
      .collection('comments')
      .where('user', '==', change.before.data().name)
      .get()
      .then((data) => {
          data.forEach((doc) => {
            const comment = database.doc(`/comments/${doc.id}`);
            group.update(comment, { userImg: change.after.data().imgUrl });
          });
          return group.commit();
        });
    } else return true;
});

// if user delete post
exports.deleteUserPost = functions.region('us-central1').firestore.document('/posts/{postId}').onDelete((snapshot, context) => {
  const postId = context.params.postId;
  const group = database.batch();
  return database.collection('comments').where('postId', '==', postId).get()
  .then((data) => {
    data.forEach((doc) => {
    group.delete(database.doc(`/comments/${doc.id}`));
  });
    return database.collection('likes').where('postId', '==', postId).get();
  })
  .then((data) => {
    data.forEach((doc) => {
    group.delete(database.doc(`/likes/${doc.id}`));
  });
    return database.collection('notices').where('postId', '==', postId).get();
  })
  .then((data) => {
    data.forEach((doc) => {
    group.delete(database.doc(`/notices/${doc.id}`));
  });
    return group.commit();
  })
  .catch((err) => console.error(err));
});