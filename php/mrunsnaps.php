<?php
	//Initial setup
	include('credentials.php');
	require_once('Snap-API/src/snapchat.php');
	date_default_timezone_set('America/Detroit');
	define('MIN_CHECK_TIME', 270); //4.5 minutes in seconds
	define('MAX_CHECK_TIME', 300); //5 minutes in seconds
	$snapchat = new Snapchat($snapchat_username, $gmail_username, $gmail_password, false);

	//Start the program
	logMessage('Starting MRun.snaps');
	runLoop();

	//Prints a log message with the date at the beginning
	function logMessage($message) {
		echo date('D M d Y h:i:s A') . ': ' . $message . "\n";
	}

	//Logs into snapchat
	function login() {
		global $snapchat;
		global $snapchat_password;
		logMessage('Logging in');
		$ret = $snapchat->login($snapchat_password);
		if ($ret['error'] != 0 ) { //|| get_object_vars($ret['data'])['status'] != 200
			logMessage('Login failed');
			logMessage('Login result: ');
			print_r($ret);
			return false;
		}
		else {
			logMessage('Logged in successfully');
			return true;
		}
	}

	//Main run loop, continually checks for new snaps and downloads them then puts them on the story.
	//	Checks random amounts of time between 4.5 and 5 minutes.
	function runLoop() {
		global $snapchat;
		while (true)
		{
			//Check for and download new snaps
			logMessage('Getting new snaps');
			$ret = $snapchat->getSnaps(true);
			if (is_bool($ret) && !$ret) {
				logMessage('Get snaps failed, should log in');
				$ret = login();
				if (!$ret) {
					logMessage('Login failed, exiting');
					exit(1);
				}
				else {
					$snapchat->getSnaps(true);
				}
			}
			$snapchat->clearFeed(); //Clear the snaps so they are marked as read and not re-downloaded

			//Check how many snaps were downloaded
			$savedSnaps = array();
			$snapFolders = array();
			$scannedFiles = scandir('./Snap-API/src/snaps'); //Scans all the username folders within the snaps directory
			foreach ($scannedFiles as $folder) {
				if (!in_array($folder, array('.','..')) && is_dir('./Snap-API/src/snaps/' . $folder)) {
					$snapFolders[] = $folder;
					$snapFiles = scandir('./Snap-API/src/snaps/' . $folder); //Scans for snaps within each username folder
					foreach ($snapFiles as $file) {
						if (!in_array($file, array('.','..','.DS_Store'))) {
							$savedSnaps[] = $folder . '/' . $file; //Add the snap to the savedSnaps array
						}
					}
				}
			}
			
			//Upload snaps if there are any new ones
			if (count($savedSnaps) > 0) {
				logMessage('Downloaded ' . count($savedSnaps) . ' new snaps');
				print_r($savedSnaps);

				//Upload snaps to story and delete the files
				logMessage('Uploading snaps to story');
				foreach ($savedSnaps as $snap) {
					logMessage('Uploading ' . $snap);
					$snapTime = strtok(strtok($snap, "."), " ");
					$snapTime = intval(strtok(" "));
					$ret = $snapchat->setStory('./Snap-API/src/snaps/' . $snap, $snapTime);
					if ($ret) {
						unlink('./Snap-API/src/snaps/' . $snap);
					}
				}

				logMessage('Done uploading');

				//Delete all username snap folders
				foreach ($snapFolders as $folder) {
					rmdir('./Snap-API/src/snaps/' . $folder);
				}
			}
			else {
				logMessage('No new snaps');
			}


			sleep(rand(MIN_CHECK_TIME, MAX_CHECK_TIME));
		}
	}

?>