/* Central API app. Loads a token on creation. Individual calls for different APIs checks the token validity before running */

const https=require('https');

class CheckoutApiController {
	constructor(foliohost, tenant, username, password, servicepoint) {
		this.token = null;
		this.foliohost = foliohost;
		this.tenant = tenant;
		this.username = username;
		this.password = password;
		this.servicepoint = servicepoint;
	}
	
	// Token Management Functions
	async confirmToken() {
		if(this.token === null) 
			this.token = await this.generateToken();
		else if(this.token.expire < Date.now())
			this.token = await this.generateToken();
	}
	async generateToken() {
		let data = await restTokenPost(this.foliohost, this.tenant, this.username, this.password);
		let token = {};
		token['value'] = data[0];
		let timestamps = JSON.parse(data[1]);
		token['expire'] = new Date(timestamps.accessTokenExpiration);
		return token;
	}
	
	// User API
	async getUserData(userbarcode) {
		await this.confirmToken();
		let data = await restUserPost(this.foliohost, this.tenant, this.token.value, userbarcode);
		return data;
	}
	
	// Item API
	async getItemData(bookbarcode) {
		await this.confirmToken();
		let data = await restItemPost(this.foliohost, this.tenant, this.token.value, bookbarcode);
		return data;
	}
	
	// Blocks APIs
	async getAutoBlocks(userid) {
		await this.confirmToken();
		let data = await restAutoBlocksPost(this.foliohost, this.tenant, this.token.value, userid);
		return data;
	}
	async getManualBlocks(userid) {
		await this.confirmToken();
		let data = await restManualBlocksPost(this.foliohost, this.tenant, this.token.value, userid);
		return data;
	}
	
	// Checkout API
	async checkoutItem(userbarcode, bookbarcode) {
		await this.confirmToken();
		let data = await restCheckoutPost(this.foliohost, this.servicepoint, this.tenant, this.token.value, userbarcode, bookbarcode);
		return data;
	}
	
}

async function restTokenPost(foliohost, tenant, username, password) {
	return new Promise((resolve,_) => {
		const path = '/authn/login-with-expiry';
		const method = 'POST';
		const body = JSON.stringify({
			tenant: tenant,
			username: username,
			password: password
		});

		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'Content-type': 'application/json',
					'X-Okapi-Tenant': tenant,
				}
		};
		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// set the encoding to avoid gibberish binary data
			response.setEncoding('utf8');
			
			
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				const regex = /folioAccessToken=(\S+); /gm;
				let token = regex.exec(headers['set-cookie'][0])[1];
				return resolve([token,data]);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error(error);
		});

		request.write(body);
		
		// End the request
		request.end();
	});
};

async function restUserPost(foliohost, tenant, token, userbarcode) {
	return new Promise((resolve,_) => {
		const path = '/users?query=barcode==' + userbarcode;
		const method = 'GET';
		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'X-Okapi-Tenant': tenant,
					'X-Okapi-Token': token,
					'Content-Type': 'application/json',
				},
		};
		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// set the encoding to avoid gibberish binary data
			response.setEncoding('utf8');
			
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				return resolve(data);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error(error);
		});
		
		// End the request
		request.end();
	});
};

async function restItemPost(foliohost, tenant, token, bookbarcode) {
	return new Promise((resolve,_) => {
		const path = '/inventory/items?query=barcode==' + bookbarcode;
		const method = 'GET';
		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'X-Okapi-Tenant': tenant,
					'X-Okapi-Token': token,
					'Content-Type': 'application/json',
				},
		};
		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// set the encoding to avoid gibberish binary data
			response.setEncoding('utf8');
			
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				return resolve(data);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error(error);
		});
		
		// End the request
		request.end();
	});
};

async function restAutoBlocksPost(foliohost, tenant, token, userid) {
	return new Promise((resolve,_) => {
		const path = '/automated-patron-blocks/' + userid;
		const method = 'GET';
		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'X-Okapi-Tenant': tenant,
					'X-Okapi-Token': token,
					'Content-Type': 'application/json',
				},
		};
		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// set the encoding to avoid gibberish binary data
			response.setEncoding('utf8');
			
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				return resolve(data);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error(error);
		});
		
		// End the request
		request.end();
	});
};

async function restManualBlocksPost(foliohost, tenant, token, userid) {
	return new Promise((resolve,_) => {
		const path = '/manualblocks?query=userid==' + userid;
		console.log(path);
		const method = 'GET';
		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'X-Okapi-Tenant': tenant,
					'X-Okapi-Token': token,
					'Content-Type': 'application/json',
				},
		};
		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// set the encoding to avoid gibberish binary data
			response.setEncoding('utf8');
			
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				return resolve(data);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error('ManualBlocks Error: ', error);
		});
		
		// End the request
		request.end();
	});
};


async function restCheckoutPost(foliohost, servicepoint, tenant, token, userbarcode, itembarcode) {
	return new Promise((resolve,_) => {
		const path="/circulation/check-out-by-barcode";
		const method='POST';
		const body = JSON.stringify({
			userBarcode: userbarcode,
			itemBarcode: itembarcode,
			servicePointId: servicepoint,
		});

		const options = {
				hostname: foliohost,
				path: path,
				method: method,
				headers: {
					'X-Okapi-Tenant': tenant,
					'X-Okapi-Token': token,
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(body),
				}
		 };

		let data='';
		const request = https.request(options, (response) => {
			// Set the encoding, so we don't get log to the console a bunch of gibberish binary data
			response.setEncoding('utf8');
		
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});
		
			// The whole response has been received. Print out the result.
			response.on('end', () => {
				console.log(data);
				return resolve(data);
			});
		});
		
		// Log errors if any occur
		request.on('error', (error) => {
			console.error(error);
		});

		request.write(body);
		
		// End the request
		request.end();
	});
};

module.exports = CheckoutApiController