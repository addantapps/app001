var express = require('express');
var http = require('http');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Client = require('node-rest-client').Client;
var fs = require('fs');
var sys = require('util');
var request = require('request');
//var serviceBaseURL = "http://192.168.1.61:13559/SubscriberAdministration.svc";
var serviceBaseURL = "http://iis.sharptech.eu:8001/SubscriberAdministration.svc";
var conv = require('binstring');

//==================================================================
// Define the strategy to be used by PassportJS
passport.use(new LocalStrategy(
    function(username, password, done) {
        request.get(serviceBaseURL+"/SubscriberCredential/"+username+","+password, function (error, response, body) {
            if (error === null && response.statusCode === 200) {
                subscriberUser = JSON.parse(body);
                return done(null, subscriberUser);
            } else { 
                return done({ message :"Error!"}, false);      
            }
        })
    }
));

// Serialized and deserialized methods when got from session
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});
//http://stackoverflow.com/questions/15609232/how-to-add-remember-me-to-my-app-with-passport
//https://www.npmjs.org/package/restless
// Define a middleware function to be used for every secured routes
var auth = function(req, res, next){
    if (!req.isAuthenticated()) 
        res.send(401);
    else
        next();
};
//==================================================================

// Start express application
var app = express();

// all environments
app.set('port', process.env.PORT || 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser()); 
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(express.session({ secret: 'securedsession' }));
app.use(passport.initialize()); // Add passport initialization
app.use(passport.session());    // Add passport initialization

app.use(function (req, res, next) {  
    if (req.method == 'POST' && req.url == '/login') {
        if (req.body.rememberme) {
            req.session.cookie.maxAge = 1000 * 60 * 3;
        } else {
            req.session.cookie.expires = false;
        }
    }
    next();
});

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

//==================================================================
// routes
app.get('/', function(req, res){
    res.render('index', { title: ' Semiacs' });
});

app.get('/users', auth, function(req, res){
    res.send([{name: "user1"}, {name: "user2"}]);
});
//==================================================================

//==================================================================
// route to test if the user is logged in or not
app.get('/loggedin', function(req, res) {
    res.send(req.isAuthenticated() ? req.user : '0');
});

// route to log in
/*app.post('/login', passport.authenticate('local'), function(req, res) {
res.send(req.user);
});
*/
app.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user) { console.log(user);
        if (user === undefined) 
            return res.send(404, err); 
        else if (user.EnrollmentStatusID == 1) { 
            req.logIn(user, function(err) { 
                if (err) {  return next(err); }
                return res.send(user); 
            });
        } else if (user.EnrollmentStatusID == 2) { 
            return res.send(303, {user: user}); 
        } 
        else return res.send(404, err);     
    })(req, res, next);
});

// route to forget password
app.post('/forget-password', function(req, res){
    client = new Client();
    pwdChangeURL =  req.protocol + "://" + req.get('host')+"/#/password-change/";
    args = {
        data : { Email : req.body.femail ,Url :pwdChangeURL} ,   
        headers:{"Content-Type": "application/json"}
    }
    AuURL = serviceBaseURL+"/ForgotPassword";
    client.post(AuURL, args, function(data, response){  
        try {
            dataJson = JSON.parse(data);
            if(dataJson.ForgotPasswordResult == 'SUCCESS' )
                res.send(200);
            else if(dataJson.ForgotPasswordResult == 'INVALID EMAIL' )
                res.send(303);
            else
                res.send(404);
        } catch(e) {
            res.send(404); 
        }  
    })
   
});


// route to change password
app.post('/change-password', function(req, res){
    client = new Client();
    args = {
        headers:{"Content-Type": "application/json"}
    };
    AuURL = serviceBaseURL+"/ResetPassword/"+req.body.validation_key+","+req.body.npassword;
    console.log(AuURL);
    client.put(AuURL, args, function(data, response){  
        dataJson = JSON.parse(data);console.log(dataJson);
        if(dataJson == 'SUCCESS' )
            res.send(200);
        else 
            res.send(404);
    })
});

// route to log out
app.post('/logout', function(req, res){
    req.logOut();
    res.send(200);
});

// route to subscriber signup
app.post('/subscriber-signup',  function(req, res) {

    args = {
        data: { 
            Address: {
                "AppartmentNumber" :  req.body.appartment,
                "BlockNumber" : req.body.block,
                "City" :req.body.city,
                "FloorNumber" :req.body.floor,
                "NameOfResidence" :req.body.nameResidence,
                "StreetName":req.body.streetName, 
                "StreetType" :req.body.streetType,
                "ZipCode" :req.body.zipCode 
            },
            Subscriber: {
                "CarMake1" :req.body.make1, "CarMake2" : req.body.make2,"CarMake3":req.body.make3,
                "CarModel1" :req.body.model1,"CarModel2" :req.body.model2 ,"CarModel3" :req.body.model3,
                "CarPlate1" :req.body.carPlate1,"CarPlate2" : req.body.carPlate2, "CarPlate3" : req.body.carPlate3, 
                "Comments" :req.body.comments, "EmailAddress" :req.body.email, "HomeStayType" : req.body.locataire,
                "FirstName" :req.body.firstName, "LastName" :req.body.LastName, 
                "MobileNumber" :req.body.mobNumber, "PhoneNumber" :req.body.phoneNumber,"Title" :req.body.title,
                "Password" :  req.body.spassword,
                "ValidationUrl" : req.protocol + "://" + req.get('host')+"/#/validate-user-email/"

            }
        },
        headers:{"Content-Type": "application/json"} 
    };
    console.log(args);
    client = new Client();
    postURL = serviceBaseURL+"/Subscriber";
    client.post(postURL, args, function(data,response) {
        try {
            res.send( JSON.parse(data));
        } catch(e) {
            res.send(404); 
        }    
    });
});

app.get("/get-locataire" , function(req, res) {
    client = new Client();
    AuURL = serviceBaseURL+"/HomeStayType";
    client.get(AuURL, function(data, response){ 
        res.send(data);
    })
});

app.post("/validate-user-email" , function(req, res) {
    client = new Client();
    AuURL = serviceBaseURL+"/Subscriber/"+req.body.email;
    client.get(AuURL, function(data, response){  
        if(JSON.parse(data) == "SUCCESS"){
            res.send(300);
        } else {
            res.send(200);
        }
    }) 
});


app.get("/validate-email-key/:validationkey" , function(req, res) {
    client = new Client();
    args = {
        headers:{"Content-Type": "application/json"} 
    };

    AuURL = serviceBaseURL+"/ValidateEmail/"+req.params.validationkey;
    client.put(AuURL, args, function(data, response){  
        if(JSON.parse(data) == "SUCCESS"){
            res.send(200);
        } else {
            res.send(300);
        }
    }) 
});

//Documents upload functions//---------------- 
app.post('/fileUpload', function(req, res){
    var temp_path = req.files.uploadfile.path;
    var save_path = './public/images/' + req.files.uploadfile.name;      
     fs.rename(temp_path, save_path, function(error){
        if(error)  {
             res.send(300);
        }  
        fs.unlink(temp_path, function(){
            if(error)  res.send(404); 
            //res.send("File uploaded to: " + save_path);
            fs.readFile(save_path,'binary',function (err, file){
                args = {
                   data: { RemoteFileInfo : {
                        'SubscriberID': req.query.subscriberID,
                        'ParkingFeeTypeID' : req.query.subdcriberType,
                        'SubscriberDocumentID' : req.query.DocumentType,
                        'Stream' : conv(file, { 'in' :"binary", out:'bytes' }),
                        'FileName' :req.files.uploadfile.name,
                        'Length': req.files.uploadfile.size,
                    }},
                     headers:{"Content-Type": "application/json"} 
                };

                client = new Client();
                AuURL = serviceBaseURL+"/SubscriberDocument";
                client.post(AuURL, args, function(data,  response){  
                    res.send(data);  
                })
            })
           
        });
        
     });        
});

app.get("/subscriber-type" , function(req, res) {
    request.get(serviceBaseURL+"/ParkingFeeType/en", function (error, response, body) {
        parseAndSendData(res,error, response, body);
    })
});

app.get("/subscriber-document-type" , function(req, res) {
    request.get(serviceBaseURL+"/SubscriberDocumentType", function (error, response, body) {
       parseAndSendData(res,error, response, body);
    })
});

// app.get("/subscriber-documents/:subscriberId" , function(req, res) {
//     request.get(serviceBaseURL+"/SubscriptionDocument/"+req.params.subscriberId, function (error, response, body) {
//        parseAndSendData(res,error, response, body);    
//     })
// });


app.get("/subscriber-documents/:subscriberId" , function(req, res) {
    request.get(serviceBaseURL+"/SubscriberDocument/"+req.params.subscriberId+",en", function (error, response, body) {
       console.log(body);
       parseAndSendData(res,error, response, body);    
    })
});

app.post("/delete-document" , function(req, res) {
//    request.del(serviceBaseURL+"/SubscriptionDocument/"+req.body.documentId, function (error, response, body) {
    request.del(serviceBaseURL+"/SubscriberDocument/"+req.body.documentId, function (error, response, body) {
        if(!error &&  response.statusCode == 200) {
            res.send( JSON.parse(body));
        } else  { 
            res.send(404); }     
    })
});

app.get("/subscriber-zone" , function(req, res) {
    request.get(serviceBaseURL+"/Zone", function (error, response, body) {
       parseAndSendData(res,error, response, body);
    })
});

////Zone attach functions...//----
app.post("/attach-zone" , function(req, res) {
    client = new Client();
    AuURL = serviceBaseURL+"/SubscriberZone";
    args = { 
        data : {
            ParkingFeeTypeID : req.body.subdcriberType,
            subscriberid : req.body.subscriberID,
            ZoneID : req.body.subscriberZone
        },
        headers:{"Content-Type": "application/json"}
    }
    client.post(AuURL, args ,function(data, response){ 
        if(JSON.parse(data) == "SUCCESS"){
            res.send(300);
        } else {
            res.send(200);
        }
    }) 
});

app.get("/attached-zones/:subscriberId" , function(req, res) {
    request.get(serviceBaseURL+"/SubscriberZone/"+req.params.subscriberId+",en", function (error, response, body) {
        parseAndSendData(res,error, response, body);
    })
});

app.post("/delete-zone" , function(req, res) {
    request.del(serviceBaseURL+"/SubscriberZone/"+req.body.zoneId, function (error, response, body) {
        if(!error &&  response.statusCode == 200) {
            res.send( JSON.parse(body));
        } else  { 
            res.send(404); }     
    })
});

app.get("/dashboard-data" , function(req, res) {  
    request.get(serviceBaseURL+"/DashBoardData/"+req.user.SubscriberID, function (error, response, body) {
        parseAndSendData(res,error, response, body);
    })
});

app.get("/parking-transactions" , function(req, res) {  
    var tURL =  req.query.dateRange ? ","+req.query.dateRange+",en" : ",en";
    request.get(serviceBaseURL+"/ParkingFee/mail1@gmail.com"+tURL, function (error, response, body) {
        parseAndSendData(res,error, response, body);
    })
});
app.get("/card-operations" , function(req, res) {  
    var tURL =  req.query.dateRange ? ","+req.query.dateRange+",en" : ",en";
    request.get(serviceBaseURL+"/SubscriberCardOperation/autherpetra@yahoo"+tURL, function (error, response, body) {
        parseAndSendData(res,error, response, body);
    })
});


var parseAndSendData = function(res, error, response, body){
    if(!error &&  response.statusCode == 200) {
        try {
            res.send( JSON.parse(body));
        } catch(e) {
            res.send(404); 
        }    
    } else {
         res.send(404); 
    }    
}


//====================================================================

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});