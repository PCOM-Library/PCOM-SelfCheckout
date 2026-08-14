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

app.post('/api/run/confirm', (req, res) => {
	let api = new CheckoutApiController(foliohost, tenant, username, password, servicepoint);
	let body = req.body;
	let book_barcode = body.book_barcode;
	let patron_barcode = body.patron_barcode;
	// patron_barcode = '000000543';
	
	let user, item, autoBlocks, manualBlocks;
	api.getUserData(patron_barcode).then(data => {
		let userJSON = JSON.parse(data);
		user = userJSON['users'][0]; // collapse to only the first user
		return api.getAutoBlocks(user.id);
	}).then(data => {
		autoBlocks = JSON.parse(data);
		console.log(autoBlocks);
		return api.getManualBlocks(user.id);
	}).then(data => {
		console.log('manual', data);
		manualBlocks = JSON.parse(data);
		console.log(manualBlocks);
		// if(canBorrow(user,blocks)) {
			// console.log("CAN BORROW");
		// }
		// else {
			// console.log('CANNOT BORROW');
		// }
	}).catch(error => {
		console.error('Error fetching data:', error);
	});
	
	
	// Promise.all([
		// api.getUserData(patron_barcode),
		// api.getItemData(book_barcode)
	// ]).then(values) => { 
		// console.log(user,item);
	// });
	
	// api.checkoutItem(patron_barcode, book_barcode);
	

	res.sendFile(path.join(__dirname,'error.html'));
});

function canBorrow(user, blocks) {
	console.log(user, blocks);
	
	if(!user.active)
		return false;

	let isBlocked = false;
	for(b of blocks.automatedPatronBlocks)
		isBlocked = isBlocked && b.blockBorrowing;
	
	return !isBlocked;
}


app.post('/api/run/checkout', (request, response) => {
	console.log("POST RECEIVED");
});