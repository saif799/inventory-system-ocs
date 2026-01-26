import Link from "next/link";

const NavBar = () => {
  return (
    <nav className="border border-gray-300 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          <Link href="/">Home</Link>
          <Link href="/add-shoes">Add Shoes</Link>
          <Link href="/orders">orders</Link>
          <Link href="/notifier">notifier</Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
