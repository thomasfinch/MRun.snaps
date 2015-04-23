var fs = require('fs');
// var zlib = require('zlib');
// var gzip = zlib.createGzip();
var snapchat = require('snapchat');
var client = snapchat.Client();
var credentials = require('./credentials.js');

const MIN_CHECK_TIME = 270; //4:30 in seconds
const MAX_CHECK_TIME = 300; //5 mins in seconds

// Make sure the images folder exists
if(!fs.existsSync('./images')) {
    fs.mkdirSync('./images');
}

// Make sure the image archive folder exists
if(!fs.existsSync('./imageArchive')) {
    fs.mkdirSync('./imageArchive');
}

// Global Error Handler
process.on('uncaughtException', function (err) {
	console.error(err.stack);
});

login();

function log(message) {
	console.log(new Date() + ': ' + message);
}

function login() {
	log('Trying to log in');
	client.login(credentials.username, credentials.password).then(function(data) {
		log('Logged in');
		getNewSnaps(); //Get new snaps now that we're logged in
	}, function(err) {
		log('Error logging in: ');
		console.log(err);
	});
}

function getNewSnaps() {
	log('Checking for new snaps');
	client.getSnaps().then(function(snaps) {

		// Handle any problems, such as wrong password
	    if (typeof snaps === 'undefined') {
	        console.error(snaps);
	        return;
	    }

	    var snapsCount = 0;
	    snaps.forEach(function(snap) {
	    	if (typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' && snap.st == 1 && (snap.m == 0 || snap.m == 1 || snap.m == 2))
	    		snapsCount++;
	    });

	    if (snapsCount == 0) {
	    	log('No new snaps');
	    	return;
	    }

	    var snapsDownloaded = 0;
	    // Loop through the latest snaps
	    snaps.forEach(function(snap) {
	        // Make sure the snap item is unopened and sent to you (not sent by you)
	        if (typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' && snap.st == 1 && (snap.m == 0 || snap.m == 1 || snap.m == 2)) {
	            log('Saving snap from ' + snap.sn + '...');

	            // Save the image to ./images/{SENDER USERNAME}_{SNAP ID}.fileExtension
	            var fileExtension = (snap.m == 0) ? 'jpg' : 'mp4';
	            var filePath;
	            if (snap.m == 0)
	            	filePath = './images/' + snap.sn + '_' + snap.id + '-' + snap.t + '.' + fileExtension;
	            else
	            	filePath = './images/' + snap.sn + '_' + snap.id + '.' + fileExtension;
	            var stream = fs.createWriteStream(filePath, { flags: 'w', encoding: null, mode: 0666 });
	            client.getBlob(snap.id).then(function(blob) {
					blob.on('close', function() {
						snapsDownloaded++;
						if (snapsDownloaded == snapsCount) {
							log('Downloaded ' + snapsDownloaded + ' new snaps');
							client.clear(); //Mark all snaps as read
							uploadSnapsToStory();
						}
					});
					blob.pipe(stream);
					blob.resume();
			    });
	        }
	    });

	}, function(err) {
		log('Error getting snaps');
		login();
	});

	setTimeout(login, Math.floor((Math.random() * (MAX_CHECK_TIME - MIN_CHECK_TIME)*1000)) + MIN_CHECK_TIME*1000); //Check for and download new snaps within the time interval
}

function uploadSnapsToStory() {
	//Get list of files in the images directory
	var snapFiles = fs.readdirSync('./images/');
	if (snapFiles.indexOf('.DS_Store') != -1)
		snapFiles.splice(snapFiles.indexOf('.DS_Store'), 1); //Remove .DS_store from the files list (if on a Mac)
	var numUploaded = 0;

	//Upload each image one by one
	snapFiles.forEach(function(filename) {
		log('Uploading snap: ' + filename);

		var isVideo = (filename.substring(filename.length - 3, filename.length) != 'jpg');
		var viewingTime = filename.substring(filename.indexOf('-') + 1, filename.indexOf('.'));
		if (isVideo)
			viewingTime = -1;
		var blob = fs.createReadStream('./images/' + filename);

		client.upload(blob, isVideo).then(function(mediaId) {
            client.addToStory(mediaId, viewingTime).catch(function(result) {
            	//On successful upload, delete the downloaded snap
        		log('Sent snap ' + filename + ' to story');
        		fs.createReadStream('./images/' + filename).pipe(fs.createWriteStream('./imageArchive/' + filename)).on('close', function() { //Archive each image, useful for blocking people etc.
        			fs.unlinkSync('./images/' + filename); //Delete the downloaded snap
        		});

            	if (++numUploaded == snapFiles.length) {
            		log('Done uploading snaps');
            	}
            });

		});
	})
}

