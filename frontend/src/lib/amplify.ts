import { Amplify } from "aws-amplify";
import outputs from "../../../amplify_outputs.json";

if (outputs.auth?.user_pool_client_id !== "REPLACE_ME") {
  Amplify.configure(outputs);
}
