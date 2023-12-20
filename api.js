'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const util = require('util');

module.exports = function (app) {

  mongoose
    .connect(process.env.DB)
    .then(console.log("connected"));

  const replySchema  = new mongoose.Schema({
    text           : String,
    created_on     : Date,
    delete_password: String,
    reported       : Boolean
  });
  const threadSchema = new mongoose.Schema({
    text           : String,
    created_on     : Date,
    bumped_on      : Date,
    reported       : Boolean,
    delete_password: String,
    replies        : [replySchema]
  });
  //password hashing
  const hashAsync = util.promisify(bcrypt.hash);
  //passwords comparing
  const compareAsync = util.promisify(bcrypt.compare);
  //error handling 
  const handleErrors = (res, error, message) => {
    
    console.error(error);
    res.status(500).send(message || 'Something went wrong');
  };

  app.route('/api/threads/:board')
    .post(  async (req, res) => {
      //retrieve parameters
      const { board }                     = req.params;
      const { delete_password: dp, text } = req.body;
      //"Message" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //password hashing
        const hash = await hashAsync(dp, 12);
        //adding a new message
        const thread = new Thread({
          text           : text,
          delete_password: hash,
          reported       : false,
          created_on     : Date.now(),
          bumped_on      : Date.now()
        });
        const result = await thread.save();
        
        res.json(result);        
      //catch password hashing error
      } catch (err) {

        handleErrors(res, err, 'Failed to create thread');
      }
    })
    .get(   async (req, res) => {
      //retrieve parameters
      const { board } = req.params;
      //"Find" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve threads
        const result = await Thread
          .find()
          .sort({ bumped_on: -1})
          .limit(10)
          .select({ reported: 0, delete_password: 0 });
        //filtering replies 
        for (let elem of result) {
          //if replies are found
          if (elem.replies.length > 0) {
            //hiding unnecessary fields
            elem.replies = elem.replies.map(reply => {

              const { delete_password, reported, ...rest } = reply.toObject();

              return rest
            });
            //sorting in descending order
            elem.replies.sort((a, b) => {

              const dateA = new Date(a.created_on);
              const dateB = new Date(b.created_on);

              return dateB - dateA;
            });
            //showing only 3 recent replies
            elem.replies = elem.replies.slice(0, 3);
        }}
        res.send(result);
      //catch board retrieving error
      } catch (err) {

        handleErrors(res, err, 'Failed to retrieve threads');
      }
    })
    .delete(async (req, res) => {
      //retrieve parameters
      const { board }                          = req.params;
      const { delete_password: dp, thread_id } = req.body;
      //"Delete" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread.findById(thread_id);
        //if thread is found
        if (result) {
          //comparing passwords
          const check = await compareAsync(dp, result.delete_password);
          //if password correct
          if (check) {
            //deleting thread
            const deleteResult = await Thread.findByIdAndDelete(thread_id);
            res.send("success");
          //catch incorrect password error
          } else {

            res.send("incorrect password");
          }
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    })
    .put(   async (req, res) => {
      //retrieve parameters
      const { board }     = req.params;
      const { thread_id } = req.body;
      //"Report" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread.findById(thread_id);
        //if thread is found
        if (result) {
          //updating report field
          const reportResult = await Thread.updateOne(
            { _id : thread_id },
            { reported: true }
          );
          res.send("reported");
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    });

  app.route('/api/replies/:board')
    .post(  async (req, res) => {
      //retrieve parameters
      const { board }                                = req.params;
      const { delete_password: dp, thread_id, text } = req.body;
      //"Reply" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread.findById(thread_id);
        //if thread is found
        if (result) {
          //password hashing
          const hash = await hashAsync(dp, 12);
          //adding a new reply
          const replyResult = await Thread.findOneAndUpdate(
            { _id: thread_id },
            { $push: {
                replies: { 
                  text           : text,
                  created_on     : Date.now(),
                  delete_password: hash,
                  reported       : false
                }
              },
              bumped_on: Date.now()
            },
            { new: true }
          );
          res.json(replyResult);
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    })
    .get(   async (req, res) => {
      //retrieve parameters
      const { board }     = req.params;
      const { thread_id } = req.query;
      //"Find" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread
          .findOne({ _id : thread_id})
          .select({ reported: 0, delete_password: 0 });
        //if thread is found
        if (result) {
          //if reply is found
          if (result.replies.length > 0) {
            //hiding unnecessary fields
            result.replies = result.replies.map(reply => {

              const { delete_password, reported, ...rest } = reply.toObject();

              return rest
            });
            res.send(result);
          }
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    })
    .delete(async (req, res) => {
      //retrieve parameters
      const { board }                                    = req.params;
      const { delete_password: dp, thread_id, reply_id } = req.body;
      //"Delete" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread.findById(thread_id);
        //if thread is found
        if (result) {
          //if reply is found
          if (result.replies.length > 0) {
            //retrieve reply index for deleting
            const replyIndex = result.replies.findIndex(reply => {

              return reply._id.toString() == reply_id;
            });
            //comparing passwords
            const check = await compareAsync(
              dp, 
              result.replies[replyIndex].delete_password
            );
            //if password correct
            if (check) {
              //deleting reply text
              const deleteResult = await Thread.updateOne(
                { _id: thread_id },
                { $set: { [`replies.${replyIndex}.text`]: "[deleted]" } }
              );
              res.send("success");
            //catch incorrect password error
            } else {

              res.send("incorrect password");
            }
          //catch no found reply error
          } else {

            res.send("Reply not found");
          }
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    })
    .put(   async (req, res) => {
      //retrieve parameters
      const { board }               = req.params;
      const { thread_id, reply_id } = req.body;
      //"Report" process
      try {
        //retrieve board
        const Thread = mongoose.model(board, threadSchema, board);
        //retrieve thread
        const result = await Thread.findById(thread_id);
        //if thread is found
        if (result) {
          //if reply is found
          if (result.replies.length > 0) {
            //retrieve reply index for reporting
            const replyIndex = result.replies.findIndex(reply => {

              return reply._id.toString() == reply_id;
            });
            //updating report field
            const reportResult = await Thread.updateOne(
                { _id: thread_id },
                { $set: { [`replies.${replyIndex}.reported`]: true } }
            );
            res.send("reported");
          //catch no found reply error
          } else {

            res.send("Reply not found");
          }
        //catch no found thread error
        } else {

          res.send("Thread not found");
        }
      //catch invalid thread id format error
      } catch (err) {

        handleErrors(res, err, 'Invalid thread id');
      }
    });
};
