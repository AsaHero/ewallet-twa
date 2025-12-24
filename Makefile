.PHONY: deploy
deploy:
	npm run build
	cp -r dist/* /var/www/ewallet-twa/
	systemctl reload nginx