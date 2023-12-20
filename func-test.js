const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  
  this.timeout(5000);

  suite('/api/threads/{board}', () => {

    let threadId;
    
    test("1. Creating a new thread", done => {

      const reqObj = {
        text: "Test",
        delete_password: "pass"
      };
      
      chai
        .request(server)
        .keepOpen()
        .post("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.property(res.body, "_id");
          assert.isString(res.body._id);
          threadId =      res.body._id;
          assert.property(res.body, "text");
          assert.equal(   res.body.text, reqObj.text);
          assert.property(res.body, "created_on");
          assert.approximately(
            new Date(     res.body.created_on).getTime(),
            new Date().getTime(),
            1000);
          assert.property(res.body, "bumped_on");
          assert.equal(   res.body.bumped_on, res.body.created_on);
          assert.property(res.body, "reported");
          assert.isFalse( res.body.reported);
          assert.property(res.body, "delete_password");
          assert.isString(res.body.delete_password);
          assert.property(res.body, "replies");
          assert.isArray( res.body.replies);
          assert.equal(   res.body.replies.length, 0);
          done();
        });
    });

    test("2. Viewing the 10 recent threads with 3 replies each", done => {

      chai
        .request(server)
        .keepOpen()
        .get("/api/threads/uno")
        .end((err, res) => {

          assert.equal(    res.status, 200);
          assert.isArray(  res.body);
          assert.equal(    res.body.length, 10);
          assert.property( res.body[0], "_id");
          assert.isString( res.body[0]._id);
          assert.property( res.body[0], "text");
          assert.isString( res.body[0].text);
          assert.property( res.body[0], "created_on");
          assert.isString( res.body[0].created_on);
          assert.property( res.body[0], "bumped_on");
          assert.isString( res.body[0].bumped_on);
          assert.notExists(res.body[0].reported);
          assert.notExists(res.body[0].delete_password);
          assert.property( res.body[0], "replies");
          assert.isArray(  res.body[0].replies);
          assert.isAtMost( res.body[0].replies.length, 3);
          done();
        });
    });

    test("3. Reporting a thread", done => {

      const reqObj = {
        thread_id : threadId
      };

      chai
        .request(server)
        .keepOpen()
        .put("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "reported");
          done();
        });
    });
    
    test("4. Deleting a thread with the incorrect password", done => {

      const reqObj = {
        thread_id : threadId,
        delete_password: "passnot"
      };

      chai
        .request(server)
        .keepOpen()
        .delete("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "incorrect password");
          done();
        });
    });

    test("5. Deleting a thread with the correct password", done => {

      const reqObj = {
        thread_id : threadId,
        delete_password: "pass"
      };

      chai
        .request(server)
        .keepOpen()
        .delete("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "success");
          done();
        });
    });
  });

  suite('/api/replies/{board}', () => {

    let threadId;
    let replyId;
    
    test("6.0. Creating a test thread", done => {

      const reqObj = {
        text: "Test",
        delete_password: "pass"
      };

      chai
        .request(server)
        .keepOpen()
        .post("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.property(res.body, "_id");
          assert.isString(res.body._id);
          threadId =      res.body._id;
          done();
        });
    });
    
    test("6. Creating a new reply", done => {

      const reqObj = {
        text: "Test",
        delete_password: "pass",
        thread_id: threadId
      };

      chai
        .request(server)
        .keepOpen()
        .post("/api/replies/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(    res.status, 200);
          assert.isArray(  res.body.replies);
          assert.isAtLeast(res.body.replies.length, 1);
          assert.approximately(
            new Date(      res.body.bumped_on).getTime(),
            new Date().getTime(),
            1000);
          assert.property( res.body.replies[0], "_id");
          assert.isString( res.body.replies[0]._id);
          replyId =        res.body.replies[0]._id;
          assert.property( res.body.replies[0], "text");
          assert.equal(    res.body.replies[0].text, reqObj.text);
          assert.property( res.body.replies[0], "created_on");
          assert.approximately(
            new Date(      res.body.replies[0].created_on).getTime(),
            new Date().getTime(),
            1000);
          assert.property( res.body.replies[0], "reported");
          assert.isFalse(  res.body.replies[0].reported);
          assert.property( res.body.replies[0], "delete_password");
          assert.isString( res.body.replies[0].delete_password);
          done();
        });
    });

    test("7. Viewing a single thread with all replies", done => {

      chai
        .request(server)
        .keepOpen()
        .get(`/api/replies/test?thread_id=${threadId}`)
        .end((err, res) => {

          assert.equal(    res.status, 200);
          assert.isArray(  res.body.replies);
          assert.isAtLeast(res.body.replies.length, 1);
          assert.notEqual( res.body.created_on, res.body.bumped_on);
          assert.notExists(res.body.replies[0].reported);
          assert.notExists(res.body.replies[0].delete_password);
          done();
        });
    });

    test("8. Reporting a reply", done => {

      const reqObj = {
        thread_id: threadId,
        reply_id: replyId
      };

      chai
        .request(server)
        .keepOpen()
        .put("/api/replies/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "reported");
          done();
        });
    });

    test("9. Deleting a reply with the incorrect password", done => {

      const reqObj = {
        thread_id : threadId,
        reply_id: replyId,
        delete_password: "passnot"
      };

      chai
        .request(server)
        .keepOpen()
        .delete("/api/replies/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "incorrect password");
          done();
        });
    });

    test("10. Deleting a reply with the correct password", done => {

      const reqObj = {
        thread_id : threadId,
        reply_id: replyId,
        delete_password: "pass"
      };

      chai
        .request(server)
        .keepOpen()
        .delete("/api/threads/test")
        .send(reqObj)
        .end((err, res) => {

          assert.equal(   res.status, 200);
          assert.isString(res.text);
          assert.equal(   res.text, "success");
          done();
        });
    });
  });
});
