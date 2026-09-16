/* Central API app for FOLIO. Contains calls for:

*/

const https = require('https');
const dotenv = require('dotenv');

class FolioApiController {
	// Created as a singleton to reduce token requests */
	static #instance;

	constructor() {
		console.log('FAC constructor');
		if(!FolioApiController.#instance)
			FolioApiController.#instance = this;


		dotenv.config({path: '.env-api'});

		this.foliohost = process.env.FOLIOHOST || '';
		this.tenant = process.env.TENANT || '';
		this.username = process.env.USERNAME || '';
		this.password = process.env.PASSWORD || '';
		this.lccn_id = process.env.LCCN_ID || '';
		this.isbn_id = process.env.ISBN_ID || '';

		this.token_control = new FolioTokenManager(this.foliohost, this.tenant, this.username, this.password);

		return FolioApiController.#instance;
	}

	static getInstance() {
		console.log('FolioApiController get instance called.....');
		if(!FolioApiController.#instance)
				return new FolioApiController();
		else
			return FolioApiController.#instance;
	}

		// Patron Data
	async getUserData(userbarcode) {
		let token_value = await this.token_control.get();
		let path = '/users?query=barcode==' + userbarcode;
		let {data, headers} = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}
	async getAutoBlocks(userid) {
		let token_value = await this.token_control.get();
		let path = '/automated-patron-blocks/' + userid;
		let {data, headers}  = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}
	async getManualBlocks(userid) {
		let token_value = await this.token_control.get();
		let path = '/manualblocks?query=userId==' + userid;
		let {data, headers} = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}

		// Inventory
	async getItemData(bookbarcode) {
		let token_value = await this.token_control.get();
		let path = '/inventory/items?query=barcode==' + bookbarcode;
		let {data, headers} = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}
	async getHoldingsData(holdingsId) {
		console.log('getHoldingsData');
		let token_value = await this.token_control.get();
		let path = '/holdings-storage/holdings/' + holdingsId;
		let {data, headers} = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}
	async getInstanceData(instanceId) {
		console.log('getInstanceData');
		let token_value = await this.token_control.get();
		let path = '/inventory/instances/' + instanceId;
		let {data, headers} = await okapiGet(path, this.foliohost, this.tenant, token_value);
		return data;
	}

	async getInstanceFromItem(item) {
		let holding, instance;
		let hdata = await this.getHoldingsData(item.holdingsRecordId);
		holding = JSON.parse(hdata);
		let idata = await this.getInstanceData(holding.instanceId);


		return idata;
	}


	// LCCN Retrieval
	async getLCCNsFromInstance(instance) {
		let regex = /(^\d+)/gm;
		let lccns = [];
		for(let id of instance.identifiers) {
			if(id.identifierTypeId == this.lccn_id && id.value != null) {
				let match = id.value.match(regex);
				if(match != null && match.length == 1)
					lccns.push(match[0]);
			}
		}
		return lccns;
	}
	async getLCCNsFromItem(item) {
		let data = await this.getInstanceFromItem(item);
		let instance = JSON.parse(data);
		let lccns = await this.getLCCNsFromInstance(instance);
		return lccns;
	}

	// ISBN Retrieval
	async getISBNsFromInstance(instance) {
		let isbns = [];
		for(let id of instance.identifiers) {
			// create the regex here because it uses a capturing group
			let regex = /^(?:\d{9}X|\d{10})$|^97[89]\d{10}$/gm;
			if(id.identifierTypeId == this.isbn_id && id.value != null) {
				// split off anything with spaces
				let val = id.value.split(' ')[0];
				// remove all hyphens
				val = val.replaceAll('-','');
				if(regex.test(val))
					isbns.push(val);
			}
		}
		return isbns;
	}
	async getISBNsFromItem(item) {
		let data = await this.getInstanceFromItem(item);
		let instance = JSON.parse(data);
		let isbns = await this.getISBNsFromInstance(instance);
		return isbns;
	}

	// Open Library Cover Images
	async generateOpenLibraryQueryPathFromItem(item) {
		const path_start = '/api/books?bibkeys=';
		const path_end = '&format=json';

		// instead of using the LCCN and ISBN calls, we'll just pull the instance once
		let data = await this.getInstanceFromItem(item);
		let instance = JSON.parse(data);

		// LCCNs
		let lccns = await this.getLCCNsFromInstance(instance);
		let lccn_bits = '';
		for(let i=0; i<lccns.length; i++) {
			if(i > 0)
				lccn_bits += ',';
			lccn_bits += 'LCCN:' + lccns[i];
		}

		// ISBNs
		let isbns = await this.getISBNsFromInstance(instance);
		// sort the isbns for ISBN-13 first
		isbns.sort(function(a, b){return b.length - a.length});
		let isbn_bits = '';
		for(let i=0; i<isbns.length; i++) {
			if(i > 0)
				isbn_bits += ',';
			isbn_bits += 'ISBN:' + isbns[i];
		}

		// Generate the path. We try to prioritize the ISBNs
		let path;
		if(lccn_bits.length > 0 &&  isbn_bits.length > 0)
			path = path_start + isbn_bits + ',' + lccn_bits + path_end;
		else if(lccn_bits.length > 0)
			path = path_start + lccn_bits + path_end;
		else if(isbn_bits.length > 0)
			path = path_start + isbn_bits + path_end;
		else
			path = '';

		return path;
	}
	
	async queryOpenLibraryData(path) {
		return new Promise((resolve,_) => {
			const method = 'GET';
			const options = {
				hostname: 'openlibrary.org',
				path: path,
				method: method,
				headers: {
					'User-Agent': 'PCOM Library Self-Checkout/1.0 (systems-libpcom@pcom.edu)',
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
					return resolve({data, headers});
				});
			});

			// Log errors if any occur
			request.on('error', (error) => {
				console.error(error);
			});

			// End the request
			request.end();
		});
	}

	async generateOpenLibraryImageUrlFromItem(item) {
		let path = await this.generateOpenLibraryQueryPathFromItem(item);
		let {data, headers} = await this.queryOpenLibraryData(path);
		let results = JSON.parse(data);

		// parse through the results
		let cover_url = '';
		Object.entries(results).forEach(([id, book]) => {
			// skip all entries once one is found
			if(cover_url.length > 0) 
				return;
			// skip if no thumbnail url in entry
			if(!book.hasOwnProperty('thumbnail_url'))
				return;
			let thumbnail = book.thumbnail_url;
			if(thumbnail != null && thumbnail.length > 0) {
				cover_url = thumbnail.replace('-S.', '-M.');
			}
		});

		return cover_url;
	}


	/* END Of FolioApiController */
}

class FolioTokenManager {
	constructor(foliohost, tenant, username, password) {
		this.foliohost = foliohost;
		this.tenant = tenant;
		this.username = username;
		this.password = password;
		this.token_value = null;
		this.token_expire = null;
	}
	async get() {
		if(this.token_value === null)
			await this.generateToken();
		else if(this.token_expire < Date.now())
			await this.generateToken();
		return this.token_value;
	}
	async generateToken() {
		console.log('Token regenerated');
		let path = '/authn/login-with-expiry';
		let body = JSON.stringify({
			tenant: this.tenant,
			username: this.username,
			password: this.password
		});
		let {data,headers} = await okapiPost(path, body, this.foliohost, this.tenant);

		var value_regex = /folioAccessToken=(\S+); /gm;
		var expire_regex = /accessTokenExpiration":"(.+)",/gm;

		this.token_value = value_regex.exec(headers['set-cookie'][0])[1];
		this.token_expire = expire_regex.exec(data)[1];
	}
}

async function okapiGet(apipath, foliohost, tenant, token = '') {
	return new Promise((resolve,_) => {
		const path = apipath;
		const method = 'GET';
		const options = {
			hostname: foliohost,
			path: path,
			method: method,
			headers: {
				'X-Okapi-Tenant': tenant,
				'Content-Type': 'application/json',
			},
		};
		if(token.length > 0)
			options.headers['X-Okapi-Token'] = token;

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
				return resolve({data, headers});
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

async function okapiPost(apipath, body, foliohost, tenant, token = '') {
	return new Promise((resolve,_) => {
		const path = apipath;
		const method ='POST';

		const options = {
			hostname: foliohost,
			path: path,
			method: method,
			headers: {
				'X-Okapi-Tenant': tenant,
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
			}
		};
		if(token.length > 0)
			options.headers['X-Okapi-Token'] = token;

		let headers = {};
		let data = '';
		const request = https.request(options, (response) => {
			// Set the encoding, so we don't get log to the console a bunch of gibberish binary data
			response.setEncoding('utf8');
			headers = response.headers;
			// As data starts streaming in, add each chunk to "data"
			response.on('data', (chunk) => {
				data += chunk;
			});

			// The whole response has been received. Print out the result.
			response.on('end', () => {
				return resolve({data, headers});
			});
		});

		// Log errors if any occur
		request.on('error', (error) => {
			console.error('\n\nERRORS--------------------');
			console.error(error);
			console.error('---------------------\n');
		});

		request.write(body);

		// End the request
		request.end();
	});
};


module.exports = new FolioApiController();