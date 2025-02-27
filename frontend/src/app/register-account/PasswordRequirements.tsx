export default function PasswordRequirements() {
  return (
    <p className="text-xs text-gray-500">
      Password must contain:
      <ul className="list-disc list-inside mt-1">
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One lowercase letter</li>
        <li>One number</li>
        <li>One special character (!@#$%^&*(),.?":{}|{'<>'})</li>
      </ul>
    </p>
  );
} 