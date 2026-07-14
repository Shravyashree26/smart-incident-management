import { Link } from "react-router-dom";
import bgImage from "../../assets/landing.png";

export default function LandingPage() {
  return (
    <div
      className="hide-scrollbar min-h-screen overflow-y-scroll w-full bg-cover bg-center flex items-center justify-center px-4"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <section className="pt-16">

      {/* Content Card */}
      <div className=" max-w-xl w-full  p-8 md:p-10 text-center transform -translate-y-65">

        <h1 className="text-4xl font-bold text-gray-900">
          Service<span className="text-blue-600">Plus</span>
        </h1>

        <p className="mt-4 text-gray-600 text-lg">
          An intelligent Incident & SLA Management Platform built for modern teams.
          Track issues, enforce SLAs, and resolve incidents faster.
        </p>

	<div className="mt-8 flex justify-center gap-4">
 	  <Link
   	     to="/login"
    	     className="px-8 py-3 rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-600 hover:text-white transition"
  	  >
    	     Login
 	  </Link>

 	  <Link
   	     to="/register"
   	     className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
  	  >
    	     Register
  	   </Link>
	 </div>
      </div>
      </section>
    </div>
  );
}

