/////////////////////////////////////////////////////////

var CONFIG = {
	jid: '',
	password: '',
	user: '',
	download_posts: true,
	remove_posts: false,
}

/////////////////////////////////////////////////////////

const xmpp = require( 'node-xmpp' );

var connection = new xmpp.Client({
	jid: CONFIG.jid,
	password: CONFIG.password,
});

var Send = ( msg ) => {
	var stanza = new xmpp.Element( 'message', { to: 'bnw@bnw.im', type: 'chat', id: '123456' } ).c( 'body' ).t( msg );
	connection.send( stanza.tree() );
}

var posts_page;
var GetPosts = ( page ) => {
	posts_page = page;
	console.log( 'Getting posts ( page ' + ( page + 1 ) + ' )' );
	Send( 'show --user=' + CONFIG.user + ( page ? ' --page=' + page : '' ) );
}

var posts = [];
var posts_i = 0;
var fetching_comments = false;
var GetComments = () => {
	fetching_comments = true;
	console.log( 'Getting comments for #' + posts[ posts_i ].id + ' ( ' + ( posts_i + 1 ) + ' / ' + ( posts.length ) + ' )' );
	Send( 'show -rm ' + posts[ posts_i ].id );
}

var RemovePosts = () => {
	console.log( 'Removing posts' );
	for ( var i = 0 ; i < posts.length ; i++ )
		Send( 'delete -m ' + posts[ i ].id );
}

var ParseComments = ( comments ) => {
	posts[ posts_i ].comments = comments;
	posts_i++;
	if ( posts_i < posts.length )
		GetComments();
	else {
		const fs = require('fs');
		fs.writeFile("bnw.json", JSON.stringify( posts ), function(err) {
		    if(err) {
		        return console.log( 'error', err);
		    }

		    console.log( 'Done, bnw.json saved!' );
		    
		    if ( CONFIG.remove_posts )
		    	RemovePosts();
		}); 
	}
}

var ParseFeed = ( message ) => {
	var found = 0;
	
	var headerstart = '+++ ';
	var footerstart = '--- ';
	
	while ( true ) {
		var post = {
			date: null,
			author: null,
			tags: null,
			clubs: null,
			body: null,
			id: null,
			comments_count: null,
			url: null,
		};
		var pos = message.indexOf( headerstart );
		if ( pos < 0 )
			break; // no more posts
		
		pos += headerstart.length;
		message = message.substring( pos );
		pos = message.indexOf( footerstart );
		if ( pos < 0 )
			break; // post never ends
		var body = message.substring( 0, pos );
		var footer = message.substring( pos + footerstart.length );
		pos = footer.indexOf( '\n' );
		if ( pos >= 0 )
			footer = footer.substring( 0, pos );
		
		// date
		if ( body[ 0 ] !== '[' || body[ 20 ] !== ']' )
			continue;
		post.date = body.substring( 1, 20 );
		body = body.substring( 22 );
		
		// author
		pos = body.indexOf( ':' );
		if ( pos < 0 )
			continue;
		post.author = body.substring( 0, pos );
		body = body.substring( pos + 2 );
		
		// tags and clubs
		var blocks = [ 'Tags', 'Clubs' ];
		
		for ( var k in blocks ) {
			var startstr = blocks[ k ] + ': ';
			if ( body.substring( 0, startstr.length ) == startstr) {
				body = body.substring( startstr.length );
				pos = body.indexOf( '\n' );
				if ( pos < 0 )
					continue;
				post[ blocks[ k ].toLowerCase() ] = body.substring( 0, pos );
				body = body.substring( pos + 1 );
			}
		}
		
		// body
		post.body = body.substring( 1, body.length - 1 );
		
		// id
		pos = footer.indexOf( ' (' );
		if ( pos < 0 )
			continue;
		post.id = footer.substring( 0, pos );
		footer = footer.substring( pos + 2 );
		
		// comments count
		pos = footer.indexOf( ') ' );
		if ( pos < 0 )
			continue;
		post.comments_count = footer.substring( 0, pos );
		
		// url
		post.url = footer.substring( pos + 2 );
		
		posts.push( post );
		found++;
	}
	
	if ( found > 0 ) {
		GetPosts( posts_page + 1 );
	}
	else {
		posts_i = 0;
		if ( CONFIG.download_posts )
			GetComments();
		else if ( CONFIG.remove_posts )
			RemovePosts();
	}
	
}

connection
	.on( 'error', ( data ) => {
		console.log( 'error', data );
	})
	.on( 'offline', () => {
		console.log( 'disconnected' );
	})
	.on( 'online', ( data ) => {
		Send( 'interface redeye' );
	})
	.on( 'stanza', ( stanza ) => {
		if ( stanza.attrs.from == 'bnw@bnw.im' ) {
			var body = stanza.getChild( 'body' );
			if ( body ) {
				var message = body.getText();
				if ( message == 'OK. Interface changed.' ) {
					
					console.log( 'CONNECTED' );
					GetPosts( 0 );
					
				}
				else if ( message.substring( 0, 'Search results:'.length ) == 'Search results:' )
					ParseFeed( message );
				else if ( fetching_comments ) {
					fetching_comments = false;
					ParseComments( message );
				}
				else
					console.log( message );
			}
		}
	})
;

