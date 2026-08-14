document.addEventListener("DOMContentLoaded", (event) => { 

	/* Button navigations */
	document.getElementById('to-book').addEventListener('click', event => {
		moveToBook();
	});
	document.getElementById('back-to-id').addEventListener('click', event => {
		moveToId();
	});

// listeners
	document.getElementById('patron_barcode').addEventListener('keyup', event => {
		if(event.code == 'Enter')
			moveToBook();
	});



});

function moveToId() {
	document.getElementById('step2').classList.remove('active-step');
	document.getElementById('step1').classList.add('active-step');
}
function moveToBook() {
	document.getElementById('step1').classList.remove('active-step');
	document.getElementById('step2').classList.toggle('active-step');
}