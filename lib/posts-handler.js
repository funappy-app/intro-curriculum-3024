'use strict';
const pug = require('pug');
const util = require('./handler-util');
const Post = require('./post');
const Cookie = require('cookies');

const trackingIdKey = 'tracking_id';

function handle(req, res) {
  const cookies = new Cookie(req,res);
  addTrackingCookie(cookies);
  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({order:[['id','DESC']]}).then((posts)=>{
        res.end(pug.renderFile('./views/posts.pug',{
          posts:posts,
          user:req.user
        }));
        console.info(
          `閲覧されました: user: ${req.user}, ` +
          `trackingId: ${cookies.get(trackingIdKey) },` +
          `remoteAddress: ${req.connection.remoteAddress} `
          );
      });

      break;
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);
        const content = decoded.split('content=')[1];
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy:req.user
        }).then(() => {
          handleRedirectPosts(req,res);
        })
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleDelete(req,res){
  switch(req.method){
    case 'POST':
      let body = [];
      req.on('data',(chunk) => {
        body.push(chunk);
      }).on('end',() => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);
        const id = parseInt(decoded.split('id=')[1]);
        console.log('id='+ id);
        Post.findByPk(id).then((post) => {
          post.destroy().then(() => {
            handleRedirectPosts(req,res);
          });
        });

      });
      break;
    default:
      util.handleBadRequest(req,res);
      break;
  }
}

function addTrackingCookie(cookies){
  //TrackingCookieが登録されているか確認
  if(!cookies.get(trackingIdKey)){
    //TrackingCookieを登録
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const expireDate = new Date(Date.now() + 1000*60*60*24);
    cookies.set(trackingIdKey,trackingId,{expires: expireDate});
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle,
  handleDelete
};
