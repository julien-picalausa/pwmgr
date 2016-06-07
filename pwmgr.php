<?php

$data_dir = '/usr/home/';
$data_file = '/.pwmgr/db.json';

function auth_fail() {
	header('HTTP/1.1 401 Unauthorized');
	exit(0);
}

function serv_fail() {
	header('HTTP/1.1 500 Internal Server Error');
	exit(1);
}

if (!isset($_POST['username']) || !isset($_POST['totp']))
	auth_fail();

$totp = intval($_POST['totp']);
if ($totp == 0)
	auth_fail();

$username = $_POST['username'];
$users = scandir($data_dir);
$id = array_search($username, $users);
if ($id === false || $users[$id] == '.' || $users[$id] == '..')
	auth_fail();

$json = file_get_contents($data_dir.$username.$data_file);
$db = json_decode($json, true);
if (!is_array($db))
	serv_fail();

if (!isset($db['otp_key']) || !isset($db['master_key_challenge']) || !isset($db['master_key_response']))
	serv_fail();

$otp_key = $db['otp_key'];
if (!preg_match('/[0-9a-f]+/', $otp_key))
	serv_fail();
$command = '/usr/local/bin/oathtool --totp  -w 2 --now="30 seconds ago" '.$otp_key.' '. str_pad($totp, 6, '0', STR_PAD_LEFT);
exec($command, $dummy, $ret_val);
if ($ret_val != 0)
	auth_fail();

if (!isset($_POST['response'])) {
	header('Content-Type: text/plain');
	header('Expires: Thu, 19 Nov 1981 08:52:00 GMT');
	header('Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
	header('Pragma: no-cache');
	echo $db['master_key_challenge'];
	exit(0);
}

if ($_POST['response'] != $db['master_key_response'])
	auth_fail();

header('Content-Type: application/json');
header('Expires: Thu, 19 Nov 1981 08:52:00 GMT');
header('Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
header('Pragma: no-cache');

unset($db['otp_key']);
unset($db['master_key_challenge']);
unset($db['master_key_response']);
	
echo json_encode($db, JSON_FORCE_OBJECT);
exit(0);
?>
