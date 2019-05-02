# bnwquit
Useful script that helps to leave bnw
Script can create local backup of all posts and comments and delete them

Installation:
git clone https://github.com/afwbkbc/bnwquit.git
cd bnwquit
npm install

Usage:
1) edit bnwquit.js and configure:
var CONFIG = {
	jid: '', // jabber id that is linked to bnw account
	password: '', // jabber password
	user: '', // name of your bnw user
	download_posts: true, // if true, will create bnw.json file with all posts and comments of specified user
	remove_posts: false, // if true, will remove all posts after downloading ( or without downloading if download_posts is false )
}
2) save
3) node bnwquit.js
