export default function PasswordRequirements() {
  return (
    <div className="text-xs text-gray-500">
      <span>Password must contain:</span>
      <ul className="list-disc list-inside mt-1">
        <li>At least 8 characters</li>
        <li>One uppercase letter</li>
        <li>One lowercase letter</li>
        <li>One number</li>
        <li>
          One special character (!@#$%^&*(),.?&quot;:{}|{"<>"})
        </li>
      </ul>
    </div>
  );
}
