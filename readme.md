# linkedit 

install dependencies

```
npm install
```


## Compile tailwind css 
read this [https://tailwindcss.com/docs/installation/tailwind-cli]

```npx @tailwindcss/cli -i ./src/input.css -o ./public/css/tailwind.css --watch```


## Application configurations

make sure correct read and write permission for user

 ```
 /uploads
 /backups
 /logs
 ```

run the development server on local

```
npm run dev
```

VPS run on Server
```
pm2 start node --node-args="-r dotenv/config --experimental-json-modules" index.js --name "mydomain"
```

Run for debug 
```
node -r dotenv/config --experimental-json-modules index.js

```
-----------------------------------------------------------------------------------------------
Start pm2 with watching, this will restart automatically when file changes detect, and ignore some file folders using this command

```
pm2 restart mydomain --watch --ignore-watch="node_modules public logs"
```
NOTE: Some time it doesn't work , don't use this
-----------------------------------------------------------------------------------------------



## How to check if Application is running....

Here is the base url structure
http://localhost:port/api/v1

- local Server
http://localhost:5050/api/v1

- Live Server
https://mydomain.com/api/v1



## API Endpoints :  /api/v1




## deploy to vps

1. make dir to /var/www/html/your-dir

2. upload files

3. Create nginx configuration 

```
sudo nano /etc/nginx/sites-available/linkedit.mydomain.com
```

## Nginx Server configuration 

past this code 

```
server {
    server_name mydomain.com www.mydomain.com;   # Replace with your server's IP address or domain name

    location /__/auth {
        proxy_pass https://mydomain-193cf.firebaseapp.com;
    }


    location / {

    	# Rate limiting (protect from DDoS)
	limit_req zone=rate_limit_zone burst=20 nodelay;
        limit_conn conn_limit_zone 10;

        # Limit max upload size (adjust if needed)
        client_max_body_size 100M;

        # Proxy settings
        proxy_pass http://localhost:5050;  # Node.js app
        proxy_http_version 1.1;

        # Forward real protocol and IP
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;

        # For WebSocket support (if any)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Preserve Host header and disable cache for upgrades
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

    }

 
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/mydomain.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/mydomain.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot


}
server {
    if ($host = www.mydomain.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    if ($host = mydomain.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name mydomain.com www.mydomain.com;
    return 404; # managed by Certbot
}


```