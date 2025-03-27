"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import LogoButton from "../navbar/LogoButton";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { generateOTP } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/api/auth";

export default function EnterEmail() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");

    const handleSendEmail = async () => {
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        console.log("trying to send...")
        try {
            // Generate OTP
            const generatedOtp = generateOTP(6);
            setOtp(generatedOtp);

            // Send password reset email with the email and OTP
            await sendPasswordResetEmail(email, generatedOtp);
        } catch (error) {
            console.error('Error sending reset email:', error);
            alert('Failed to send reset email');
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-col items-center justify-center">
                <div className="mb-2">
                    <LogoButton width={70} height={70} />
                </div>
                <CardTitle className="text-alpbBlue">
                    Forgot Password
                </CardTitle>
                <CardContent>
                    {otp == "" ? (
                        <div>
                            <Label htmlFor="email">Enter Email Address</Label>
                            <Input 
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@example.com"
                                required={true}
                            />
                            <Button onClick={handleSendEmail}>Send email</Button>
                        </div>
                    ) : (
                        <div>
                            
                        </div>
                    )}
                </CardContent>
            </CardHeader>
        </Card>
    )
}