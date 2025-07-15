# Visma Auto Expense

> Check for new Altibox invoice and send to Visma for expense processing

## Features

- 🤖 Automated browser login to Altibox
- 📄 Automatic invoice detection and download
- 📧 Email forwarding to Visma

## Usage

### Environment variables

See [.env.example](.env.example) for the required environment variables.

### Without Docker

```sh
# Install dependencies
npm install

# Run the script
npm start
# or
npx tsx index.ts
```

### With Docker

```bash
docker build -t visma-auto-expense .
```

### Schedule the cronjob

```bash
crontab -e
```

Add the following line to the crontab to run it 16:37 the 15. every month and output logs to a file:

```sh
37 16 15 * * docker run --rm visma-auto-expense >> /home/knut/visma-auto-expense/logs.txt
```
