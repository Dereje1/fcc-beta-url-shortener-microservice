'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');
/* additional Modules needed */
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}))
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

/* mongoose* and schema*/
mongoose.connect(process.env.MONGO_URI,  {useNewUrlParser: true })
mongoose.connection.on('connected', () => console.log('db connected!'));

const linksSchema = new mongoose.Schema({
    original: {type: String, required: true},
    shortened: {type: String, required: true},
}, {timestamps: true})

const Link = mongoose.model('Link', linksSchema)

// middleware to verify link
const verifyURL = (req, res, next)=>{
    const requestedUrl = url.parse(req.body.url)
    if(requestedUrl.host){// returns false if link cant be parsed by url
      dns.lookup(requestedUrl.host,(err, data)=>{// domain check returns err if can't get domain
        if(err) res.json({"error":"invalid URL"})
        else next()
      })
    }else res.json({"error":"invalid URL"})
}

/*API endpoints*/
// post new link end point
app.post("/api/shorturl/new", verifyURL, (req, res) =>{
  const requestedURL = new URL(req.body.url);
  const query={original: requestedURL}
  Link.find(query,(err,data)=>{// first check if link already in db
    if(err) return err
    console.log(data)
    if(data.length){//Url has already been created just send existing info from db
      res.json({original_url: data[0].original, short_url: data[0].shortened})
    }else{//add new Link doc
      const newEntry = {original: requestedURL, shortened: generateKey()}
      Link.create(newEntry,(err,data)=>{
        if(err) return err
        res.json({original_url: data.original, short_url: data.shortened})
      })
    }
  })
});
// redirect from shortened endpoint
app.get('/api/shorturl/:key', (req, res)=>{
  console.log(req.params.key)
  const query = {shortened: req.params.key}
  Link.find(query,(err, data)=>{
    if(err) return err
    if(!data.length)res.json({"error":"invalid shortened URL"}) // no shortened key found
    else res.redirect(data[0].original)
  })
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});

/* Utilities */

const generateKey = () =>{// random key generator
  const all='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key=''
  let charLength=5
  while(true){
    const idx = Math.floor(Math.random()*all.length)
    key += all[idx]
    charLength--
    if(charLength === 0) break;
  }
  return key
}