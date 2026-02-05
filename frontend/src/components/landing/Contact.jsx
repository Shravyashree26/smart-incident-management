import { useState } from "react";
import { showSuccess, showError } from "../../utils/toast";
import { sendContactForm } from "../../api/authApi";

export default function Contact() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sendContactForm(form);

      showSuccess("Thanks for reaching out! We'll contact you soon.");
      setForm({ name: "", email: "", message: "" });

    } catch (error) {
      showError(
        error?.response?.data?.message || "Failed to send message"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-32 px-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center">Contact Us</h2>

        <form
          onSubmit={handleSubmit}
          className="mt-14 bg-white p-10 rounded-2xl shadow-xl"
        >
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full p-3 mb-4 border rounded-lg"
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-3 mb-4 border rounded-lg"
          />

          <textarea
            name="message"
            placeholder="Message"
            value={form.message}
            onChange={handleChange}
            required
            className="w-full p-3 mb-6 border rounded-lg"
          />

          <button
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-medium ${
              loading
                ? "bg-blue-400 text-white"
                : "border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            }`}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}
