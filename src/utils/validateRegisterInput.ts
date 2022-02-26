import { RegisterInput } from "../types/RegisterInput";

export const validateRegisterInput = (registerInput: RegisterInput) => {
  const { email, username, password } = registerInput;
  if (!email.includes("@"))
    return {
      message: "Invalid email",
      errors: [
        {
          field: "email",
          message: "Please enter a valid email",
        },
      ],
    };

  if (username.includes("@)"))
    return {
      message: "Invalid username",
      errors: [
        {
          field: "username",
          message: "Username cannot includes @ symbol",
        },
      ],
    };

  if (username.length <= 2)
    return {
      message: "Invalid username",
      errors: [
        {
          field: "username",
          message: "Username's length must greater than 2",
        },
      ],
    };
  if (password.length <= 2)
    return {
      message: "Invalid password",
      errors: [
        {
          field: "password",
          message: "password's length must greater than 2",
        },
      ],
    };
  return null;
};
