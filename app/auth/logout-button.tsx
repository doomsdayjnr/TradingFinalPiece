import { logout } from "./actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="primary-button">Logout</button>
    </form>
  );
}
