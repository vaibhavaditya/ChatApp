class ApiResponse{
    constructor(
        statusCode,
        data,
        message = "Fetched the data successfully",
    ){
        this.statuscode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

export  { ApiResponse }