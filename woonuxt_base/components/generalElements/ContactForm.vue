<template>
    
    <form @submit.prevent="submitForm">
        <div class="mb-5">
            <input type="text" placeholder="Full Name" required class="w-full px-4 py-3 border-2 placeholder:text-gray-900 text-gray-800 rounded-md outline-none focus:ring-1 border-[#253779] focus:border-primary ring-primary bg-slate-100 focus:bg-white" name="name" v-model="name"/>
        </div>
        <div class="mb-5">
            <input id="email_address" type="email" placeholder="Email Address" name="email" required class="w-full px-4 py-3 border-2 placeholder:text-gray-900 text-gray-800 rounded-md outline-none focus:ring-1 border-[#253779] focus:border-primary ring-primary bg-slate-100 focus:bg-white" v-model="email"/> 
        </div>
        <div class="mb-3">
            <textarea name="message" required placeholder="Your Message" class="w-full px-4 py-3 border-2 placeholder:text-gray-900 text-gray-800 rounded-md outline-none h-36 focus:ring-1 border-[#253779] focus:border-primary ring-primary bg-slate-100 focus:bg-white"  v-model="message"></textarea>
        </div>
        <button class="rounded text-center transition focus-visible:ring-2 ring-offset-2  px-6 py-3 bg-primary text-white hover:bg-[#253779]  border-2 border-transparent w-full" type="submit">Send Message</button>
        <div class="text-green-500 mt-2" id="success" v-if="success">{{ success }}</div>
    </form>

  </template>
  
  <script>
  const WEB3FORMS_ACCESS_KEY = "7cb460b0-427f-439a-95cd-4fe99d078601";
  const successMessage = "Message Sent";

  export default {
    data() {
      return {
        name: "",
        email: "",
        message: "",
        success: "",
        subject: "New Message from Vincor Website",
        from_name: "Contact Form"
      };
    },
    methods: {
      async submitForm() {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            access_key: "b00fc672-a555-4a36-9280-493eb7b1368d",
            name: this.name,
            email: this.email,
            subject: this.subject,
            from_name: this.from_name,
            message: this.message,
          }),
        });
        const result = await response.json();
        if (result.success) {
          this.success=successMessage;
        }
      },
    },
  };
  </script>