# Use official Node.js image as a base
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port the app runs on (adjust as necessary)
EXPOSE 3000

# Start the app
CMD ["npm", "run", "server"]
