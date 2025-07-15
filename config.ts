import dotenv from 'dotenv';
import {z} from 'zod';

// Load the stored variables from `.env` file into process.env
dotenv.config();

const environmentSchema = z.object({
	BROWSER_HEADLESS: z.stringbool().default(true),
	ALTIBOX_USERNAME: z.string().min(1),
	ALTIBOX_PASSWORD: z.string().min(1),
	ALTIBOX_LOGIN_URL: z.url().default('https://www.altibox.no/minesider/login'),
	ALTIBOX_INVOICE_URL: z
		.url()
		.default('https://www.altibox.no/minesider/konto/faktura'),
	VISMA_EMAIL: z.email().min(1),
	RESEND_API_KEY: z.string().min(1),
	RESEND_EMAIL_FROM: z.string().min(1),
	DOWNLOAD_DIR: z.string().default('./downloads'),
});
const parsedEnvironment = environmentSchema.parse(process.env);

export default {
	browserHeadless: parsedEnvironment.BROWSER_HEADLESS,
	altibox: {
		username: parsedEnvironment.ALTIBOX_USERNAME,
		password: parsedEnvironment.ALTIBOX_PASSWORD,
		loginUrl: parsedEnvironment.ALTIBOX_LOGIN_URL,
		invoiceUrl: parsedEnvironment.ALTIBOX_INVOICE_URL,
	},
	visma: {
		email: parsedEnvironment.VISMA_EMAIL,
	},
	resend: {
		apiKey: parsedEnvironment.RESEND_API_KEY,
		emailFrom: parsedEnvironment.RESEND_EMAIL_FROM,
	},
	downloadDir: parsedEnvironment.DOWNLOAD_DIR,
};
