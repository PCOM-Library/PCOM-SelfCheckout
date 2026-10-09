document.addEventListener("DOMContentLoaded", (event) => { 
	
	/* prevent submission on enter */
	if(	document.getElementById('checkout_form')) {
			document.getElementById('checkout_form').addEventListener('keydown', (event) => {
				// Check if the pressed key is Enter
				if (event.key === 'Enter') {
					event.preventDefault(); // Block submission
					console.log('Enter key pressed! Form submission blocked.');
				}
		});
	}


	/* Button navigations */
	if(	document.getElementById('to-book'))
		document.getElementById('to-book').addEventListener('click', event => { moveToBook(); });
	if( document.getElementById('back-to-id'))
		document.getElementById('back-to-id').addEventListener('click', event => { moveToId(); });

// listeners
	if(document.getElementById('patron_barcode')) {
		document.getElementById('patron_barcode').addEventListener('keyup', event => {
			if(event.code == 'Enter') moveToBook();
		});
	}
	if(document.getElementById('book_barcode')) {
		document.getElementById('book_barcode').addEventListener('keyup', event => {
			console.log(event.code);
			if(event.code == 'Enter') 
				document.getElementById('to-checkout').click();
		});
	}
	
});

function moveToId() {
	document.getElementById('step2').classList.remove('active-step');
	document.getElementById('step1').classList.add('active-step');
	document.getElementById('patron_barcode').focus();
}
function moveToBook() {
	document.getElementById('step1').classList.remove('active-step');
	document.getElementById('step2').classList.toggle('active-step');
	document.getElementById('book_barcode').focus();
}