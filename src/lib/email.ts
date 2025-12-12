// src/lib/email.ts
import emailjs from "@emailjs/browser";

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
    try {
        const response = await emailjs.send(
            "service_tx0zqnq",      // your service ID
            "template_friuhk4",     // your template ID
            {
                email: to,
                otp: otp,
            },
            "HWCaIse8Jnb6MzhsR"     // your public key
        );

        console.log("EmailJS success:", response);
        return true;
    } catch (error) {
        console.error("EmailJS error:", error);
        return false;
    }
}
