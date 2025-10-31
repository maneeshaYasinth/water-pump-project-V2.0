import React from "react";

const InputField = ({ icon: Icon, ...props }) => (
  <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-xl px-4 py-2 mb-3">
    <Icon className="text-waterBlue" size={20} />
    <input
      {...props}
      className="flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-500"
    />
  </div>
);

export default InputField;
