const express = require('express');
const cors = require('cors');
const path = require('path');
const ejs = require('ejs');
const CheckoutApiController = require('./checkoutApiController');

const dotenv = require('dotenv');
dotenv.config();
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 3000;
const servicepoint = process.env.SERVICEPOINT || '';
const foliohost = process.env.FOLIOHOST || '';
const tenant = process.env.TENANT || '';
const username = process.env.USERNAME || '';
const password = process.env.PASSWORD || '';
const campusLong = process.env.CAMPUS_LONG || '';
const campusShort = process.env.CAMPUS_SHORT || '';

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
	response.render('checkout', {});
});

app.post('/api/run/confirm', async (request, response) => {
	let api = new CheckoutApiController(foliohost, tenant, username, password, servicepoint);
	let body = request.body;
	let book_barcode = body.book_barcode;
	let patron_barcode = body.patron_barcode;
	//patron_barcode = '000000543';
	// book_barcode = '32243001436003';
	//book_barcode = '32243001734480';
	
	
	let error_flag = false;
	let error_msg = 
		'Unable to complete self-checkout at this time. Please see library staff for assistance.';
	
	let user, item;
	api.getUserData(patron_barcode).then(data => {
		// Grab patron data and confirm patron exists and is active
		let userJSON = JSON.parse(data);
		// check that a singular user was found
		if(userJSON.totalRecords != 1) {
			error_flag = true;
			error_msg = 'Unable to find patron with barcode ' + patron_barcode + '. Please try again.'; 
			throw new Error(error_msg);
		}
		
		// collapse to only the first user
		user = userJSON['users'][0]; 
		
		// check if user is active
		if(!user.active) {
			error_flag = true;
			error_msg = 'Patron (barcode: ' + patron_barcode + ') account is not activated.';
			throw new Error(error_msg);
		}
		
		return api.getAutoBlocks(user.id);
	}).then(data => {
		// Check for Automatic Blocks on Patron
		let autoBlocks = JSON.parse(data);
		if(autoBlocks.automatedPatronBlocks.length > 0) {
			for(b of autoBlocks.automatedPatronBlocks) {
				if(b.blockBorrowing) {
					error_flag = true;
					error_msg = 'Patron (barcode: ' + patron_barcode + ') account is blocked from borrowing.';
					throw new Error(error_msg);
				}
			}
		}
		
		return api.getManualBlocks(user.id);
	}).then(data => {
		// Check for Manual Blocks on Patron
		let manualBlocks = JSON.parse(data);
		if(manualBlocks.totalRecords > 0) {
			for(b of manualBlocks.manualblocks) {
				if(b.borrowing) {
					error_flag = true;
					error_msg = 'Patron (barcode: ' + patron_barcode + ') account is blocked from borrowing.';
					throw new Error(error_msg);
				}
			}
		}
		return api.getItemData(book_barcode)
	}).then( data => {
		// Check Item Data
		
		// 1 item
		// can circulate - Permanent Loan Type
		// stats available
		// material type or what for reserves?
		// 
		let itemJSON = JSON.parse(data);
		if(itemJSON.totalRecords != 1) {
			error_flag = true;
			error_msg = 'Unable to find item with barcode ' + book_barcode + '. Please try again.'; 
			throw new Error(error_msg);
		}
				
		// collapse to only the first user
		item = itemJSON['items'][0]; 
		api.getInstanceFromItem(item);
		
		
		if(item.permanentLoanType.name == 'Does not circulate') {
			error_flag = true;
			error_msg = 'The following items is for <b>in-library use only</b> and cannot be checked out:'
				+ '<div class="inset_item">' + item.title + '</div>';
			throw new Error(error_msg);
		}
		else if(item.status.name != 'Available') {
			error_flag = true;
			error_msg = 'The following item (barcode: ' + book_barcode 
				+ ') is not currently available for checkout:'
				+ '<div class="inset_item">' + item.title + '</div>';
			throw new Error(error_msg);
		}
		
	}).catch(error => {
		if(error_flag) // not a data fetching or JS error 
			return response.render('error_page', {'error_msg': error_msg});
		else
			console.error('Error fetching data:', error);
	}).finally(() => {
		console.log('SUCCESS!');
	});
	
	// Promise.all([
		// api.getUserData(patron_barcode),
		// api.getItemData(book_barcode)
	// ]).then(values) => { 
		// console.log(user,item);
	// });
	
	// api.checkoutItem(patron_barcode, book_barcode);
	

	//response.sendFile(path.join(__dirname,'error.html'));
});




app.post('/api/run/checkout', (request, response) => {
	console.log("POST RECEIVED");
});

