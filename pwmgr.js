
var MB = Math.pow(Math.pow(2, 10), 2);
var scrypt;
scrypt_module_factory(function(scrypt_module) {scrypt = scrypt_module}, { requested_total_memory: 32*MB });


const kAuthInit = 0;
const kAuthRequestSent = 1;
const kAuthResponseSent = 2;
const kAuthDone = 3;
var auth_state = kAuthInit;
var master_password;
var submission;
var req;
var status_el;

function CancelAndCall(f) {
	return function(e) {
		if (!e) e = window.event;
		e.preventDefault();
		f();
		return false;
	}
}

window.onload = function() {
	document.getElementById('logon_form').onsubmit = CancelAndCall(OnLogon);
	document.getElementById('new_challenge_form').onsubmit = CancelAndCall(OnNewChallenge);
	document.getElementById('refresh_form').onsubmit = CancelAndCall(OnRefresh);
}

function GenerateKey(password, salt) {
	var encoded_password = scrypt.encode_utf8(password);
	var encoded_salt = toByteArray(salt);
	var encoded_key = scrypt.crypto_scrypt(encoded_password, encoded_salt, Math.pow(2, 14), 8, 1, 63);
	return fromByteArray(encoded_key);
}

function OnNewChallenge() {
	var password = document.getElementById('password_ch').value;
	var challenge = document.getElementById('challenge').value;
	var response = GenerateKey(password, challenge);
	var response_p = document.getElementById('challenge_response');
	response_p.textContent = 'Response: ' + response;
}

function CopyPassword(entry) {
	password = GenerateKey(master_password, entry.salt);
	var replacement1 = '-';
	var replacement2 = '_';
	if (entry.subs != undefined) {
		replacement1 = entry.subs[0];
		replacement2 = entry.subs[1];
	}
	password = password.replaceAll("+", replacement1).replaceAll("/", replacement2);

	if (entry.extra_subs) {
		for (const [character, replacement] of Object.entries(entry.extra_subs)) {
			password = password.replaceAll(character, replacement);
		}
	}

	if (entry.length != undefined)
		password = password.substr(-entry.length);
	CopyText(password);
}

function CopyText(text) {
	var source = document.getElementById('copy_source');
	source.textContent = text;
	var range = document.createRange();
	range.selectNode(source);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	source.textContent = '';
}

function OnLogonFailed() {
	document.getElementById('logon').disabled = false;
	document.getElementById('refresh').disabled = false;
	status_elm.textContent = "Communication error during authentication.";
}

function OnLogonResponse() {
	if (req.status != 200) {
		auth_state = kAuthInit;
		document.getElementById('logon').disabled = false;
		document.getElementById('refresh').disabled = false;
		switch (req.status) {
			case 401:
				status_elm.textContent="Authentication rejected.";
				break;
			case 500:
				status_elm.textContent="Server error.";
				break;
			default:
				status_elm.textContent="Unexpected error.";
				break;
		}
		return;
	}

	if (auth_state == kAuthRequestSent)
		SendResponse();
	else if (auth_state == kAuthResponseSent)
		ProcessData();
}

function SendResponse() {
	status_elm.textContent="Calculating challenge response...";

	challenge = req.response;
	submission.append('response', GenerateKey(master_password, challenge));

	
	status_elm.textContent="Finalizing authentication...";
	req = new XMLHttpRequest();
	req.onerror=OnLogonFailed;
	req.onload=OnLogonResponse;
	req.responseType="json";

	req.open('POST', 'pwmgr.php');
	req.send(submission);

	auth_state = kAuthResponseSent;
}

function ProcessData() {
	auth_state = kAuthDone;

	var data = req.response;

	status_elm.textContent="Done";
	document.getElementById('initial').hidden = true;
	document.getElementById('loaded').hidden = false;
	//Remove the master password from the DOM
	document.getElementById('password').value = '';	
	document.getElementById('TOTP2').value = '';	
	status_elm = document.getElementById('status2')
	document.getElementById('refresh').disabled = false;

	var password_table = document.getElementById('password_table');
	var categories = Object.create(null);

	for(var id in data) {
		var entry = data[id];

		var category_data = categories[entry.category];

		if (category_data === undefined) {
			var template = document.getElementById('category');
			category_section = document.importNode(template.content, true);
			category_section.id = 'category-' + entry.category;
			category_section.querySelector('.category_title th').textContent = entry.category;
			category_data = {
				section: category_section,
				entries: Object.create(null)
			}
			categories[entry.category] = category_data;
		}


		var template =  document.getElementById('entry');
		entry_row = document.importNode(template.content, true);
		entry_row.id = id;
		var cells = entry_row.querySelectorAll('td');
		if (entry.link) {
			var link = document.createElement('a');
			link.href = entry.location;
			link.target = '_blank';
			link.textContent = entry.location;
			cells[1].appendChild(link);
		}
		else {
			cells[1].textContent = entry.location;
		}
		cells[2].textContent = entry.username;
		cells[4].textContent = entry.extra;
		cells[5].textContent = entry.gen_time;
		var buttons = cells[3].querySelectorAll('button');
		buttons[0].onclick = function(entry) {
		       return function(){CopyText(entry.username);}
		} (entry);
		buttons[1].onclick = function(entry) {
			return function(){CopyPassword(entry);}
		} (entry);
		category_data.entries[id] = entry_row;
	}

	var existing_bodies = password_table.querySelectorAll('tbody');
	for (var i = 0; i < existing_bodies.length; i++) {
		password_table.removeChild(existing_bodies[i]);
	}

	var sorted_categories = Object.keys(categories).sort();
	for (var i = 0; i < sorted_categories.length; i++) {
		var category = sorted_categories[i];
		var sorted_entries = Object.keys(categories[category].entries).sort()
		for (var j = 0; j < sorted_entries.length; j++) {
			var entry = sorted_entries[j];
			categories[category].section.querySelector('tbody').appendChild(categories[category].entries[entry]);
		}
		password_table.appendChild(categories[category].section);
	}
}

function OnLogon() {
	if (auth_state != kAuthInit)
		return;

	document.getElementById('logon').disabled = true;

	master_password = document.getElementById('password').value;

	status_elm = document.getElementById('status');
	status_elm.textContent="Sending Authentication request...";

	submission = new FormData();
	submission.append('username', document.getElementById('username').value);
	submission.append('totp', document.getElementById('TOTP').value);

	req = new XMLHttpRequest();
	req.onerror=OnLogonFailed;
	req.onload=OnLogonResponse;
	req.responseType="text";

	req.open('POST', 'pwmgr.php');
	req.send(submission);

	auth_state = kAuthRequestSent;
}

function OnRefresh() {
	if (auth_state != kAuthDone && auth_state != kAuthInit)
		return;

	document.getElementById('refresh').disabled = true;

	submission.set('totp', document.getElementById('TOTP2').value);
	
	status_elm.textContent="Reauthenticating...";
	req = new XMLHttpRequest();
	req.onerror=OnLogonFailed;
	req.onload=OnLogonResponse;
	req.responseType="json";

	req.open('POST', 'pwmgr.php');
	req.send(submission);

	auth_state = kAuthResponseSent;
}

