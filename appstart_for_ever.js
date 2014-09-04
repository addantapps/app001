/***************************************************************
/******* script to run the code forever
***************************************************************/
var forever = require('forever');

var child = new (forever.Monitor)('app.js', {
  	options	: ['c'],
  	command	: 'node'
});

//child.on('exit', this.callback);
child.start();
child.on('watch:restart', function(info) {
    console.error('Restaring script because ' + info.file + ' changed');
});

child.on('restart', function() {
    console.error('Forever restarting script for ' + child.times + ' time');
});

child.on('exit:code', function(code) {
    console.error('Forever detected script exited with code ' + code);
});

forever.startServer(child);