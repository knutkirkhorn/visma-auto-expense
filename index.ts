import {existsSync, mkdirSync, readFileSync} from 'fs';
import path, {join} from 'path';
import {setTimeout} from 'timers/promises';
import {fileURLToPath} from 'url';
import {chromium} from 'playwright';
import type {Browser, Page} from 'playwright';
import {Resend} from 'resend';
import config from './config';

// Ensure download directory exists
if (!existsSync(config.downloadDir)) {
	mkdirSync(config.downloadDir, {recursive: true});
}

const resend = new Resend(config.resend.apiKey);

interface InvoiceInfo {
	filename: string;
	filepath: string;
	date: string;
}

async function sendDiscordMessage(message: string) {
	if (!config.discordWebhookUrl) {
		console.log('❌ Discord webhook URL not set, skipping message');
		return;
	}

	await fetch(config.discordWebhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			content: message,
		}),
	});
}

class VismaAutoExpense {
	private browser: Browser | null = null;
	private page: Page | null = null;

	async init() {
		console.log('🚀 Initializing browser...');
		try {
			this.browser = await chromium.launch({
				headless: config.browserHeadless,
				slowMo: 1000,
			});
			this.page = await this.browser.newPage();
			console.log('✅ Browser initialization complete');
		} catch (error) {
			console.error('❌ Browser initialization failed:', error);
			throw error;
		}
	}

	async login() {
		console.log('🔐 Logging into Altibox...');

		if (!this.page) throw new Error('Browser not initialized');

		try {
			// Navigate to login page
			await this.page.goto(config.altibox.loginUrl);

			// Wait for login form to load - username button in this case
			await this.page.waitForSelector('input[autocomplete="username"]', {
				timeout: 10000,
			});

			// Fill in credentials
			await this.page.fill(
				'input[autocomplete="username"]',
				config.altibox.username,
			);
			await this.page.fill(
				'input[autocomplete="current-password"]',
				config.altibox.password,
			);

			// Click login button
			await this.page.click('button[aria-label="login"]');

			// Wait for successful login
			await this.page.waitForURL('**/minesider/**', {timeout: 15000});

			console.log('✅ Successfully logged in');
		} catch (error) {
			console.error('❌ Login failed:', error);
			throw error;
		}
	}

	async checkForNewInvoice(): Promise<InvoiceInfo | undefined> {
		if (!this.page) throw new Error('Browser not initialized');

		console.log('📄 Navigating to invoice page...');
		await this.page.goto(config.altibox.invoiceUrl);

		// Click cookie message if visible
		try {
			// Wait for the Cybot Cookiebot button to load
			await this.page.waitForSelector(
				'button[id="CybotCookiebotDialogBodyButtonDecline"]',
			);
			console.log('✅ Cookiebot button found');
			await this.page.click(
				'button[id="CybotCookiebotDialogBodyButtonDecline"]',
			);
			console.log('✅ Cookiebot button clicked');
			await setTimeout(3000);
		} catch {
			console.log('✅ No cookie message found');
		}

		console.log('🔍 Checking for new invoices...');

		// Wait for download invoice button to load
		await this.page.waitForSelector(
			'div[class^="invoice_detailsButtonContainer"] fds-button[variant="primary"]:has-text("Last ned PDF")',
			{timeout: 10000},
		);

		// Get the download invoice button
		const downloadButton = this.page.locator(
			'div[class^="invoice_detailsButtonContainer"] fds-button[variant="primary"]:has-text("Last ned PDF")',
		);

		// Check if this invoice is from current month
		const invoiceDate = await this.page
			.locator(
				'dt[class^="desktop-max-typography_formds-common-subtitle-secondary__"]',
			)
			.textContent();
		const currentMonth = new Date().toLocaleDateString('no-NO', {
			month: 'long',
			year: 'numeric',
		});

		if (
			invoiceDate &&
			invoiceDate.toLowerCase().includes(currentMonth.toLowerCase())
		) {
			console.log('📄 Found new invoice for current month');

			// Download the invoice
			if (downloadButton) {
				// Set up download listener
				const downloadPromise = this.page!.waitForEvent('download');
				await downloadButton.click();
				const download = await downloadPromise;

				// Save file
				const filename =
					download.suggestedFilename() || `invoice-${Date.now()}.pdf`;
				const filepath = join(config.downloadDir, filename);
				await download.saveAs(filepath);

				console.log(`💾 Downloaded invoice: ${filename}`);

				return {
					filename,
					filepath,
					date: new Date().toISOString(),
				};
			}
		} else {
			console.log('📅 No invoice found for current month');
		}

		return undefined;
	}

	async sendInvoiceToVisma(invoiceInfo: InvoiceInfo) {
		console.log('📧 Sending invoice to Visma...');

		try {
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
			const filepath = `${__dirname}/downloads/${invoiceInfo.filename}`;
			const attachment = readFileSync(filepath).toString('base64');

			const {error} = await resend.emails.send({
				from: config.resend.emailFrom,
				to: [config.visma.email],
				subject: 'Altibox invoice - Expense',
				html: '<p>Invoice attached</p>',
				attachments: [
					{
						content: attachment,
						filename: invoiceInfo.filename,
					},
				],
			});

			if (error) {
				console.error({error});
				throw error;
			}

			console.log('✅ Invoice email sent successfully');
		} catch (error) {
			console.error('❌ Failed to send email:', error);
			throw error;
		}
	}

	async cleanup() {
		console.log('🧹 Cleaning up browser...');
		if (this.browser) {
			await this.browser.close();
		}
	}

	async run() {
		try {
			await this.init();
			await this.login();

			const invoiceInfo = await this.checkForNewInvoice();

			if (invoiceInfo) {
				await this.sendInvoiceToVisma(invoiceInfo);
				await sendDiscordMessage('✅ Invoice email sent to Visma');
			} else {
				await sendDiscordMessage('📅 No invoice found for current month');
			}
		} catch (error) {
			console.error('❌ Automation failed:', error);
			await sendDiscordMessage('❌ Automation failed');
		} finally {
			await this.cleanup();
		}
	}
}

console.log('🤖 Starting Visma auto expense...');
const automation = new VismaAutoExpense();
await automation.run();
console.log('✅ Automation completed');
