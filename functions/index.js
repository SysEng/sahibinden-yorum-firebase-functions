const admin = require('firebase-admin');
const functions = require('firebase-functions');
const serviceAccount = require('./serviceAccountKey.json');

const cors = require('cors')({
  origin: true,
});

// // We'll enable CORS support to allow the function to be invoked
// // from our app client-side.

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fabled-mystery-287411.firebaseio.com"
});

const db = admin.database();

exports.getAllComments = functions.https.onRequest((request, response) => {

  return cors(request, response, () => {
    let resp = { success: false, message: '' }
    let uid = request.body.uid;

    try {

      if (uid == undefined || uid == '' || request.method.toLowerCase() != 'post') {
        throw new Error('bilgiler hatalı!');
      }

      admin
        .auth()
        .getUser(uid)
        .then((result) => {
          return result;
        })
        .then((result) => {
          let user = result;

          db
            .ref('users/' + user.uid)
            .orderByChild('classifiedId')
            .once('value')
            .then((result) => {
              let snapshot = result;
              let comments = [];

              snapshot.forEach((childSnapshot) => {
                let data = childSnapshot.val();
                comments.push({
                  classifiedId: data.classifiedId,
                })
              });

              resp.success = true;
              resp.message = comments;

              response.send(resp);
            })
            .catch((error) => {
              resp.success = false;
              resp.message = error

              response.send(resp);
            })
        })
    } catch (err) {
      resp.success = false;
      resp.message = err.message;

      response.send(resp);
    }
  });
});

exports.getComments = functions.https.onRequest((request, response) => {
  return cors(request, response, () => {

    let resp = { success: false, message: '' }
    let classifiedId = request.body.classifiedId;

    try {
      if (classifiedId == '' || classifiedId == undefined || request.method.toLowerCase() != 'post') {
        throw new Error('bilgiler hatalı!');
      }

      db
        .ref('classifieds/' + classifiedId)
        .orderByChild('created_at')
        .once('value')
        .then((result) => {
          let snapshot = result;
          let comments = [];

          snapshot.forEach((childSnapshot) => {
            let data = childSnapshot.val();

            comments.push({
              email: data.email.split('').map((el, i) => { if (i > 0 && i < data.email.indexOf('@') - 1) { return '*' } else { return el } }).join(''),
              comment: data.comment,
              created_at: data.created_at,
            })
          });

          comments.sort((a, b) => {
            return b.created_at - a.created_at;
          })

          resp.success = true;
          resp.message = comments;

          response.send(resp);
        })
        .catch((error) => {
          resp.success = false;
          resp.message = error

          response.send(resp);
        })

    } catch (err) {
      resp.success = false;
      resp.message = err.message;

      response.send(resp);
    }
  });
});

exports.setComment = functions.https.onRequest((request, response) => {

  return cors(request, response, () => {

    let resp = { success: false, message: '' }
    let uid = request.body.uid;
    let comment = request.body.comment;
    let classifiedId = request.body.classifiedId;

    try {

      if (uid == undefined || uid == '' || comment == undefined || comment == '' || classifiedId == '' || classifiedId == undefined || request.method.toLowerCase() != 'post') {
        throw new Error('bilgiler hatalı!');
      }

      admin
        .auth()
        .getUser(uid)
        .then((result) => {
          return result
        })
        .then((result) => {
          let user = result;
          if (user.emailVerified == false) {
            resp.success = false;
            resp.message = 'E-Posta adresi doğrulanmamış';

            response.send(resp);
          }

          if (user.emailVerified == true) {

            db
              .ref('users/' + user.uid)
              .orderByChild('classifiedId')
              .equalTo(classifiedId)
              .once('value')
              .then((result) => {
                let snapshot = result;

                console.log('exists.snapshot', snapshot.val());

                if (snapshot.exists() == false) {
                  console.log('classified not exists');

                  db
                    .ref('users/' + user.uid)
                    .push({
                      classifiedId: classifiedId
                    });

                } else {
                  console.log('classified exists');
                }
              });

            db
              .ref('classifieds/' + classifiedId)
              .push({
                uid: user.uid,
                email: user.email,
                comment: comment,
                created_at: Date.now()
              })
              .then((result) => {
                resp.success = true;
                resp.message = 'ok';

                response.send(resp);
              })
              .catch((error) => {
                resp.success = false;
                resp.message = err.code;

                response.send(resp);
              })
          }
        })
        .catch((error) => {

          if (error.code != undefined) {
            if (error.code == 'auth/user-not-found') {
              resp.success = false;
              resp.message = 'Kullanıcı bulunamadı!';
            }
          }

          response.send(resp);
        })
    } catch (err) {
      resp.success = false;
      resp.message = err.message;

      response.send(resp);
    }

  });
});
