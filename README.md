# PCOM Self-Checkout for FOLIO
This code was heavily influenced by the similar FOLIO project, [FOLIOSelfCheckoutKiosk](https://github.com/carnold2/FOLIOSelfCheckoutKiosk) by [carnold](https://github.com/carnold2). 

## FOLIO User Permissions
For this app, you need to create a FOLIO user with the following permissions:
* Check out: Check out circulating items
* Users: Can view user profile
* Inventory storage - get holdings collection
* Inventory: View instances, holdings, and items
* Manualblocks collection get
* Manualblocks item get
* Patron blocks - get blocks for patron

## Node Configuration ##
This Node app requires to .env files to be created: `.env-api` and `.env-checkout`. 

### .env-api
The contents of `.env-api` are used by [FolioApiController.js](FolioApiController.js) for essential API connections and functionality. The needed configuration variables are:
* FOLIOHOST
* USERNAME
* PASSWORD
* LCCN_ID
* ISBN_ID

_FOLIOHOST_ and _TENANT_ can be found in FOLIO under _Settings > Developer > Okapi Console_. Do not include https:// with _FOLIOHOST_. _LCCN_ID_ and _ISBN_ID_ can be found by making an API call to `/identifier-types`.

### .env-checkout
The contents of `.env-checkout` are used primarily for functioning of the self-checkout system and display. The expected variables are:
* PORT
* SERVICEPOINT
* CAMPUS_LONG
* CAMPUS_SHORT

_PORT_ is typically '3000'. `SERVICEPOINT` should be the identifier as found at the end of the URL when you select the desired service point in FOLIO at _Settings > Tenant > Service Points_. _CAMPUS_LONG_ and _CAMPUS_SHORT_ are used in the page's `h1` and `title` elements, respectively. 
