import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-start md:justify-around pt-10 pb-10 px-5 bg-black">
<img src="/icon.png" alt="AfricasKing" className='w-[600px] h-full hidden md:flex' />
      <div className="bg-white rounded-2xl py-8 px-7 w-full max-w-xs shadow-xl mb-6">
        <Link
          href="/login"
          className="block py-4 border-b border-gray-200 text-zinc-800 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="block py-4 border-b border-gray-200 text-zinc-800 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="block py-4 text-zinc-800 text-sm font-medium hover:opacity-70 transition-opacity"
        >
          Contact
        </Link>
        <Link
          href="/dashboard"
          className="block mt-5 w-full py-3.5 bg-[#f44335] text-white text-sm font-semibold rounded-full text-center hover:opacity-90 transition-opacity"
        >
          Video
        </Link>
      </div>
<img src="/icon.png" alt="AfricasKing" className='w-96 flex md:hidden' /> 
    </div>
  );
}
