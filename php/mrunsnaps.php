<?php
	//Initial setup
	include("credentials.php");
	require_once("Snap-API/src/snapchat.php");
	date_default_timezone_set("America/Detroit");
	define("MIN_CHECK_TIME", 270); //4.5 minutes in seconds
	define("MAX_CHECK_TIME", 300); //5 minutes in seconds
	$snapchat = new Snapchat($snapchat_username, $gmail_username, $gmail_password, false);

	function logMessage($message) {
		echo date("D M d Y h:i:s A") . ": " . $message . "\n";
	}

	function getNewSnaps() {
		logMessage("Getting new snaps");
		$snapchat->getSnaps(true);
	}

	function uploadSnapsToStory() {
		// foreach($snaps as $snap) {
		// 	$id = $snap->id;
		// 	$from = $snap->sender;
		// 	$time = $snap->sent;
		// }
	}

	logMessage("Started, logging in");
	$snapchat->login($snapchat_password);
	logMessage("Logged in");

?>