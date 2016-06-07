# pwmgr

Pwmgr is a simple online password manager.

## Motivations

There is a number of widely used online password managers out there, so the
reasons for writing one more might not seem obvious. A search for currently
known password managers that do not use a local password database reveals that
they usually have two issues:

1. They tend to be feature-rich, which increases the risk for vulnerabilities.
   (See
   http://people.eecs.berkeley.edu/~dawnsong/papers/sec14-paper-li-zhiwei.pdf
   for exemples.)
2. They require you to trust a third-party with the handling of all of your 
   passwords.

The second issue is something that many people will rightfully ignore under the
argument that the third-parties in question will make sure they cannot actually
access your passwords. However, this compounded with the first issue means you
never know when a fancy new feature introduced on the server side turns out to
introduce a security breach. This might not be acceptable for everyone.

This project simply aims to put the user in control of the server-side with a
simple and secure implementation. There is little enough code that anyone with
knowledge of php and javascript should be able to audit all the sensitive code
on their own.

## Features

The major point of this implmementation is that it is feature-poor by design.
There are however a few vital points that needed to be implemented as well
as some minor convenience that has been added in order to have a usable result.

The implemented features are as follow:

* A shell script for easing the editing of the password database.
* Server-side code which implement the password manager itself.
* Passwords are generated using scrypt as KDF. They are output as modified
  base64 strings with choosable replacements for + and /.
* Passwords are generated entirely on the client side. Only a salt is stored
  in the database
* Two factor authentication
* The generated passwords are never shown on screen. Passwords are generated
  and copied to the clipboard on demand.
* Support for multiple users.

## Dependencies

This project has the following dependencies dependencies:

* [js-jscrypt](https://github.com/tonyg/js-scrypt)
* [base64-js](https://github.com/beatgammit/base64-js/releases)
* [jq](https://stedolan.github.io/jq/)
* [OATH Toolkit](http://www.nongnu.org/oath-toolkit/)
* [PHP](https://secure.php.net/)
* [PHP JSON's extension](https://secure.php.net/manual/en/book.json.php)
* A webserver of your choice.

## Installation

1. Install all the dependencies.
2. Put index.html, pwmgr.css and pwmgr.js at a location of your choice within
   your webroot.
3. Put pwmgr.php at a location that is readable by php.
4. Install the pwmgr shell script where it can be run by your users (such as
   /usr/bin)

pwmgr will use ~/.pwmgr/db.json as the default location for its database. By
default, pwmgr.php will by default search /usr/home/{username}/.pwmgr/db.json
If this is not what you want, you can change the `$data_dir` and `$data_file`
variables at the top of pwmgr.php and link the database as needed. Ideally, the
database should be kept at a location readable by php but outside of your
webroot.
