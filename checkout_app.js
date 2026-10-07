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
const servicepoint = process.env.SERVICEPOINT || '';
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

app.listen(port, hostname, () => {
	console.log(`API server listening on port ${port}`);
});

app.get('/', (request, response) => {
	response.render('pages/checkout', {});
});

app.post('/confirm', async (request, response) => {
	//let api = new FolioApiController(foliohost, tenant, username, password);
	let body = request.body;
	let book_barcode = body.book_barcode;
	let patron_barcode = body.patron_barcode;

	let ejs_vars = {};
	ejs_vars.book_barcode = book_barcode;
	ejs_vars.patron_barcode = patron_barcode;
	ejs_vars.heading = 'Unexpected Error';
	ejs_vars.message = 
		'Unable to complete self-checkout at this time. Please see library staff for assistance.';
	
	let user, item, cover_url;
	folioAPI.getUserData(patron_barcode).then(data => {
		// Grab patron data and confirm patron exists and is active
		let userJSON = JSON.parse(data);
		// check that a singular user was found
		if(userJSON.totalRecords != 1) {
			ejs_vars.heading = 'User Not Found';
			ejs_vars.message = 
				'Unable to find patron with barcode ' + patron_barcode + '.';
			throw new CheckoutError(ejs_vars, CheckoutErrorType.USER);
		}

		// collapse to only the first user
		user = userJSON['users'][0]; 
		ejs_vars.user = user;

		// check if user is active
		if(!user.active) {
			ejs_vars.heading = 'Inactive Account';
			ejs_vars.message = 
				'Patron (barcode: ' + patron_barcode + ') account is inactive.';
			throw new CheckoutError(ejs_vars, CheckoutErrorType.USER);
		}

		return folioAPI.getAutoBlocks(user.id);
	}).then(data => {
		// Check for Automatic Blocks on Patron
		let autoBlocks = JSON.parse(data);
		if(autoBlocks.automatedPatronBlocks.length > 0) {
			for(b of autoBlocks.automatedPatronBlocks) {
				if(b.blockBorrowing) {
					ejs_vars.heading = 'Account Blocked';
					ejs_vars.message = 
						'Patron (barcode: ' + patron_barcode + ') account is currently blocked from borrowing. Contact library staff for details.';
					throw new CheckoutError(ejs_vars, CheckoutErrorType.USER);
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
					ejs_vars.heading = 'Account Blocked';
					ejs_vars.message = 
						'Patron (barcode: ' + patron_barcode + ') account is currently blocked from borrowing. Contact library staff for details.';
					throw new CheckoutError(ejs_vars, CheckoutErrorType.USER);
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
			ejs_vars.heading = 'Unknown Item';
			ejs_vars.message = 
				'Unable to find item with barcode ' + book_barcode + '.';
			throw new CheckoutError(ejs_vars,CheckoutErrorType.ITEM);
		}
				
		// collapse to only the first user
		item = itemJSON['items'][0]; 
		ejs_vars.item = item;

		// parse the metadata in item title
		let meta = item.title.split(' / ');
		ejs_vars.item_title = tc.titleCase(meta[0]);
		
		if(meta.length > 1) {
			let contributors = meta[1].split(' ; ');
			if(contributors.length > 1) {
				// grab only first contributor listing
				ejs_vars.item_author = contributors[0];
			}
			else if(contributors.length == 1) {
				// strip off the trailing period
				ejs_vars.item_author = meta[1].slice(0,-1);
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
			ejs_vars.cover_url = cover_url;
		
		if(item.permanentLoanType.name == 'Does not circulate') {
			ejs_vars.heading = 'In-Library Use Only';
			ejs_vars.message = 
				'The following item is for <b>in-library use only</b> and cannot be checked out:';
			throw new CheckoutError(ejs_vars, CheckoutErrorType.ITEM);
		}
		else if(item.status.name != 'Available') {
			ejs_vars.heading = 'Unavailable for Checkout'
			ejs_vars.message = 'The following item is not currently available for checkout:';
			throw new CheckoutError(ejs_vars,CheckoutErrorType.ITEM);
		}
		
		return folioAPI.checkoutItemForUser(user, item, servicepoint);
	}).then( data => {
		checkout = JSON.parse(data);
		// grab friendly patron name
		ejs_vars.patronName = user.personal.firstName;
		if(user.personal.preferredFirstName)
			ejs_vars.patronName = user.personal.preferredFirstName;
		
		// grab due date and time
		let dueDateTime = new Date(checkout.dueDate);
		ejs_vars.dueDate = new Intl.DateTimeFormat('en-US', {dateStyle: 'full'}).format(dueDateTime);
		ejs_vars.dueTime = new Intl.DateTimeFormat('en-US', {hour:'numeric', minute:'numeric', timeZoneName:'short', timeZone:'America/New_York'}).format(dueDateTime);
		
		return response.render('pages/success', ejs_vars);
	}).catch(error => {
		if(error instanceof CheckoutError) { 
			// not a data fetching or JS error so render error page 
			if(error.error_type == CheckoutErrorType.USER)
				return response.render('pages/user_error', error.variables);
			else if(error.error_type == CheckoutErrorType.ITEM)
				return response.render('pages/item_error', error.variables);
			else 
				return response.render('pages/generic_error', error.variables);
		}
		else {
			ejs_vars.exception_error = error;
			return response.render('pages/generic_error', ejs_vars);
		}
		return;
	}).finally(() => {
		// If all else has completed
	});
	
});