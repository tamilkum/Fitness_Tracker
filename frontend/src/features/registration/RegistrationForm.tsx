import { useState, type FormEvent } from "react";

interface RegistrationFormProps {
  onRegistered: (firstName: string, lastName: string) => Promise<void>;
}

export default function RegistrationForm({
  onRegistered,
}: RegistrationFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onRegistered(firstName, lastName);
      setFirstName("");
      setLastName("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" id="registration">
      <p className="eyebrow">JOIN THE CHALLENGE</p>
      <h2>Create your profile</h2>
      <p className="muted">
        Your first and last name identify your challenge profile.
      </p>

      <form className="registration-form" onSubmit={handleSubmit}>
        <label>
          First name
          <input
            required
            maxLength={80}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>

        <label>
          Last name
          <input
            required
            maxLength={80}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>

        <button className="primary-button" disabled={submitting}>
          {submitting ? "Creating profile..." : "Create profile"}
        </button>
      </form>
    </section>
  );
}
