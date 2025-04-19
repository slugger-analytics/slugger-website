"use client";

import TextareaInput from "../components/input/TextareaInput";
import { registerWidget, createWidget } from "../../api/widget";
import { useStore } from "@nanostores/react";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "../components/input/InputField";
import SubmitButton from "../components/input/SubmitButton";
import SelectField from "../components/input/SelectField";
import { signUpUser } from "../../api/auth"; // Now importing from api/auth
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import LogoButton from "../components/navbar/LogoButton";
import { Textarea } from "../components/ui/textarea";
import { $user } from "@/lib/userStore";
import { useToast } from "@/hooks/use-toast";

export function WidgetForm() {
  const [visibility, setVisibility] = useState("");
  const router = useRouter();
  const { idToken } = useAuth();
  const user = useStore($user);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value as string;
    });

    try {
      // if (!idToken) {
      //   throw new Error("ID Token not found. Please log in again.");
      // }
      console.log(user);

      const widgetData = {
        widget_name: data["widget-name"],
        description: data["description"],
        visibility: visibility,
        userId: user.id,
      };

      await createWidget(widgetData);
      router.push("/dashboard"); // or wherever you want to redirect after success
    } catch (error) {
      console.error(error);
      toast({
        title: "Error registering widget",
        description: error instanceof Error ? error.message : "",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-[450px] pb-5 px-5 h-[520px]">
      <CardHeader className="flex flex-col items-center justify-center">
        <div className="mb-2">
          <LogoButton width={70} height={70} />
        </div>
        <CardTitle className="text-alpbBlue">
          Get started with SLUGGER
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="widget-name">Widget Name</Label>
              <Input
                id="widget-name"
                name="widget-name"
                type="text"
                required={true}
                placeholder="Your widget name"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="description">A brief description</Label>
              <Textarea
                id="description"
                name="description"
                required={false}
                placeholder="A brief description"
              />
            </div>

            <Separator className="my-4" />
            <div className="flex flex-col space-y-1.5">
              <Select
                name="account-type"
                required={true}
                onValueChange={(vis) => setVisibility(vis)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="public">Public</SelectItem>
                    {/* <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Your team only - Hagerstown Flying Boxcars</SelectItem> */}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SubmitButton btnText="Sign up" className="mt-8" />
        </form>
      </CardContent>
    </Card>
  );
}
