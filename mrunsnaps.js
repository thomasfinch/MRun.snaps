var fs = require('fs');
var zlib = require('zlib');
var gzip = zlib.createGzip();
var snapchat = require('snapchat');
var client = snapchat.Client();
var credentials = require('./credentials.js');

// Make sure the images folder exists
if(!fs.existsSync('./images')) {
    fs.mkdirSync('./images');
}

downloadNewSnaps();

function downloadNewSnaps() {
	client.login(credentials.username, credentials.password).then(function(data) {
		console.log(new Date()+': '+'Logged in');

	    // Handle any problems, such as wrong password
	    if (typeof data.snaps === 'undefined') {
	        console.error(data);
	        return;
	    }

	    var snapsCount = 0;
	    data.snaps.forEach(function(snap) {
	    	if (typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' && snap.st == 1 && (snap.m == 0 || snap.m == 1 || snap.m == 2))
	    		snapsCount++;
	    });

	    if (snapsCount == 0) {
	    	console.log(new Date()+': '+'No new snaps');
	    	return;
	    }

	    var snapsDownloaded = 0;
	    // Loop through the latest snaps
	    data.snaps.forEach(function(snap) {
	        // Make sure the snap item is unopened and sent to you (not sent by you)
	        if (typeof snap.sn !== 'undefined' && typeof snap.t !== 'undefined' && snap.st == 1 && (snap.m == 0 || snap.m == 1 || snap.m == 2)) {
	            console.log(new Date()+': '+'Saving snap from ' + snap.sn + '...');

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
							console.log(new Date()+': '+'Downloaded ' + snapsDownloaded + ' new snaps');
							client.clear(); //Mark all snaps as read
							uploadSnapsToStory();
						}
					});
					blob.pipe(stream);
					blob.resume();
			    });
	        }
	    });
	});

	setTimeout(downloadNewSnaps, 60000); //Check for and download new snaps every 60 seconds
}

function uploadSnapsToStory() {
	var snapFiles = fs.readdirSync('./images/');
	if (snapFiles.indexOf('.DS_Store') != -1)
		snapFiles.splice(snapFiles.indexOf('.DS_Store'), 1); //Remove .DS_store from the files list (if on a Mac)

	snapFiles.forEach(function(filename) {
		console.log(new Date()+': '+'Uploading snap: ' + filename);

		var isVideo = (filename.substring(filename.length - 3, filename.length) != 'jpg');
		var viewingTime = filename.substring(filename.indexOf('-') + 1, filename.indexOf('.'));
		if (isVideo)
			viewingTime = -1;
		var blob = fs.createReadStream('./images/' + filename);

		client.upload(blob, isVideo).then(function(mediaId) {
            client.addToStory(mediaId, viewingTime).catch(function(result) {
        		console.log(new Date()+': '+'Sent snap ' + filename + ' to story');
            	fs.unlinkSync('./images/' + filename); //Delete the downloaded snap
            });

		});
	})
}

