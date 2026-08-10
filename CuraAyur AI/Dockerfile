FROM node:20-slim

# Install Python and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set up work directory
WORKDIR /app

# We are assuming the docker build context is the root of the "CuraAyur AI" repository 
# (the parent folder containing both "CuraAyur AI" and "fl_prediction_engine")

# Copy ML engine requirements first for caching
COPY fl_prediction_engine/requirements.txt /app/fl_prediction_engine/

# Create a virtual environment and install python dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r /app/fl_prediction_engine/requirements.txt

# Copy Node.js package.json and install dependencies
COPY "CuraAyur AI/package*.json" "/app/CuraAyur AI/"
WORKDIR "/app/CuraAyur AI"
RUN npm install

# Copy all the rest of the application files
COPY fl_prediction_engine /app/fl_prediction_engine
COPY "CuraAyur AI" "/app/CuraAyur AI"

# Build TypeScript if necessary (assuming there's a build script)
RUN npm run build || echo "No build script found, skipping"

# Expose the API port
EXPOSE 3000

# Start the Node.js application
CMD ["npm", "start"]
