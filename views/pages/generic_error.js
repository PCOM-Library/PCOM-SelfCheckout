<!DOCTYPE html>
<html lang="en">
	<head>
<%- include('../partials/head') %>
		<title>Item Error: PCOM Library Self-Checkout</title>
	</head>
	<body class="error">
	
		<!-- COMMON HEADER -->
<%- include('../partials/header') %>
		<!-- END COMMON HEADER -->

		<main>
			<div id="content">
				<h2>
					<span class="fa-solid fa-triangle-exclamation"></span>
					<%- heading %>
					<span class="fa-solid fa-triangle-exclamation"></span>
				</h2>
				<div class="error_message">
					<p><%- message %></p>
					
					<% if(typeof item != 'undefined') {%>
						<div class="inset_item">
							<% if(typeof cover_url != 'undefined') { %>
								<div class="book_cover">
									<span id="cover_alt_start" hidden>Cover of</span>
									<img src="<%= cover_url %>" aria-labelledby="cover_alt_start item_title">
								</div>
							<% } %>
							<div class="metadata">
								<div class="title" id="item_title"><%= item_title %></div>
								<hr aria-hidden="true">
								<div class="author"><%= item_author %></div>
							</div>
						</div>
					<%}%>						
					<% if(typeof cover_url != 'undefined') { %>
						<div class="cover_disclaimer">
							(cover image may differ from library copy)
						</div>
					<%}%>
				</div>
			</div>
			<div id="reset_message">
				<div id="left_bar" class="timebar"></div>
				<div id="time_msg">
					Returning to Start in <span id="timer">20</span>
				</div>
				<div id="right_bar" class="timebar"></div>
			</div>
			
		</main>

		<!-- COMMON FOOTER -->
<%- include('../partials/footer') %>
		<!-- END COMMON FOOTER -->

		<script>
			var lbar = document.getElementById('left_bar');
			var rbar = document.getElementById('right_bar');
			var time_msg = document.getElementById('time_msg');
			var timer = document.getElementById('timer');

			var totalWidth = reset_message.offsetWidth;
			var barWidthMax = totalWidth - time_msg.offsetWidth - 1.5;
			barWidthMax = barWidthMax / 2;
			console.log(barWidthMax);
			lbar.style.width = barWidthMax + 'px';
			rbar.style.width = barWidthMax + 'px';
			
			var time_limit = 20;
			var seconds_left = time_limit;
			var interval = setInterval(function() {
			
				seconds_left = seconds_left - 1;
				lbar.style.width = (barWidthMax * seconds_left / time_limit) + 'px';
				rbar.style.width = (barWidthMax * seconds_left / time_limit) + 'px';
				
				if(seconds_left > 0)
					timer.innerHTML = seconds_left.toString().padStart(2, '0');
				else if (seconds_left <= 0) {
					 timer.innerHTML = '00'; 
					 clearInterval(interval);
					 //window.location.href= '/'; 
				}
			}, 1000);
		</script>
	</body>
</html>