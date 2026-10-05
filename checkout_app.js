const express = require('express');
const cors = require('cors');
const path = require('path');
const ejs = require('ejs');
const tc = require('title-case');
const folioAPI = require('./FolioApiController');


const dotenv = require('dotenv');
dotenv.config({path: '.env-checkout'});
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 3000;
// const servicepoint = process.env.SERVICEPOINT || '';
// const foliohost = process.env.FOLIOHOST || '';
// const tenant = process.env.TENANT || '';
// const username = process.env.USERNAME || '';
// const password = process.env.PASSWORD || '';
const campusLong = process.env.CAMPUS_LONG || '';
const campusShort = process.env.CAMPUS_SHORT || '';

class CheckoutError extends Error {
	constructor(vars, error_type) {
		super('Checkout Error');
		this.name = 'CheckoutError';
		this.variables = vars;
		this.error_type = error_type;
	}
}
const CheckoutErrorType = {
	USER: 'user',
	ITEM: 'item'
};

const app = express();
app.use(cors());

// serve CSS files from the /assets folder
app.use(express.static('assets'))

// //Configuring body parser middleware
// app.use(bodyParser.urlencoded({ extend: false}));
// app.use(bodyParser.json());

app.use(express.json());       
app.use(express.urlencoded({extended: false})); 

// set the view engine to ejs and set locals
app.set('view engine', 'ejs');
app.locals.campus_long = campusLong;
app.locals.campus_short = campusShort;

app.listen(port,hostname, () => {
	console.log(`API server listening on port ${port}`);
});

app.get('/', (request, response) => {
	//response.sendFile(path.join(__dirname,'checkout.html'));
	response.render('pages/checkout', {});
});

app.post('/api/run/confirm', async (request, response) => {
	//let api = new FolioApiController(foliohost, tenant, username, password);
	let body = request.body;
	let book_barcode = body.book_barcode;
	let patron_barcode = body.patron_barcode;
	//patron_barcode = '000000543';
	//book_barcode = '32243001436003';
	//book_barcode = '32243001734480';

	let error_vars = {};
	error_vars.book_barcode = book_barcode;
	error_vars.patron_barcode = patron_barcode;
	error_vars.heading = 'Unexpected Error';
	error_vars.message = 
		'Unable to complete self-checkout at this time. Please see library staff for assistance.';
	
	let user, item, cover_url;
	folioAPI.getUserData(patron_barcode).then(data => {
		// Grab patron data and confirm patron exists and is active
		let userJSON = JSON.parse(data);
		// check that a singular user was found
		if(userJSON.totalRecords != 1) {
			error_vars.heading = 'User Not Found';
			error_vars.message = 
				'Unable to find patron with barcode ' + patron_barcode + '.';
			throw new CheckoutError(error_vars, CheckoutErrorType.USER);
		}

		// collapse to only the first user
		user = userJSON['users'][0]; 
		error_vars.user = user;

		// check if user is active
		if(!user.active) {
			error_vars.heading = 'Inactive Account';
			error_vars.message = 
				'Patron (barcode: ' + patron_barcode + ') account is inactive.';
			throw new CheckoutError(error_vars, CheckoutErrorType.USER);
		}

		return folioAPI.getAutoBlocks(user.id);
	}).then(data => {
		// Check for Automatic Blocks on Patron
		let autoBlocks = JSON.parse(data);
		if(autoBlocks.automatedPatronBlocks.length > 0) {
			for(b of autoBlocks.automatedPatronBlocks) {
				if(b.blockBorrowing) {
					error_vars.heading = 'Account Blocked';
					error_vars.message = 
						'Patron (barcode: ' + patron_barcode + ') account is currently blocked from borrowing. Contact library staff for details.';
					throw new CheckoutError(error_vars, CheckoutErrorType.USER);
				}
			}
		}

		return folioAPI.getManualBlocks(user.id);
	}).then(data => {
		// Check for Manual Blocks on Patron
		let manualBlocks = JSON.parse(data);
		if(manualBlocks.totalRecords > 0) {
			for(b of manualBlocks.manualblocks) {
				if(b.borrowing) {
					error_vars.heading = 'Account Blocked';
					error_vars.message = 
						'Patron (barcode: ' + patron_barcode + ') account is currently blocked from borrowing. Contact library staff for details.';
					throw new CheckoutError(error_vars, CheckoutErrorType.USER);
				}
			}
		}

		return folioAPI.getItemData(book_barcode)
	}).then( data => {
		/* Check Item Data:
			- only 1 item
			- can circulate - Permanent Loan Type
			- status is available
		*/ 
		let itemJSON = JSON.parse(data);
		if(itemJSON.totalRecords != 1) {
			error_vars.heading = 'Unknown Item';
			error_vars.message = 
				'Unable to find item with barcode ' + book_barcode + '.';
			throw new CheckoutError(error_vars,CheckoutErrorType.ITEM);
		}
				
		// collapse to only the first user
		item = itemJSON['items'][0]; 
		error_vars.item = item;

		// parse the metadata in item title
		let meta = item.title.split(' / ');
		error_vars.item_title = tc.titleCase(meta[0]);
		
		if(meta.length > 1) {
			let contributors = meta[1].split(' ; ');
			if(contributors.length > 1) {
				// grab only first contributor listing
				error_vars.item_author = contributors[0];
			}
			else if(contributors.length == 1) {
				// strip off the trailing period
				error_vars.item_author = meta[1].slice(0,-1);
			}
		}

		return folioAPI.generateOpenLibraryImageUrlFromItem(item);
	}).then( data => {
		/* Check Item Data:
			- can circulate - Permanent Loan Type
			- status is available
		*/
		cover_url = data;
		if(cover_url.trim().length > 0)
			error_vars.cover_url = cover_url;
		
		if(item.permanentLoanType.name == 'Does not circulate') {
			error_vars.heading = 'In-Library Use Only';
			error_vars.message = 
				'The following item is for <b>in-library use only</b> and cannot be checked out:';
			throw new CheckoutError(error_vars, CheckoutErrorType.ITEM);
		}
		else if(item.status.name != 'Available') {
			error_vars.heading = 'Unavailable for Checkout'
			error_vars.message = 'The following item is not currently available for checkout:';
			throw new CheckoutError(error_vars,CheckoutErrorType.ITEM);
		}
		
	}).catch(error => {
		if(error instanceof CheckoutError) { 
			// not a data fetching or JS error so render error page 
			if(error.error_type == CheckoutErrorType.USER)
				return response.render('pages/user_error', error.variables);
			else if(error.error_type == CheckoutErrorType.ITEM)
				return response.render('pages/item_error', error.variables);
		}
		else
			console.error('Error fetching data:', error);
		
		console.log('exiting promise chain due to errors');
		return;
	}).finally(() => {
		console.log('Promize chain complete');
	});
	
});




app.post('/api/run/checkout', (request, response) => {
	console.log("POST RECEIVED");
});

