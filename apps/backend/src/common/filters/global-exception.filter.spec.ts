import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; send: jest.Mock };
  let mockHost: { switchToHttp: jest.Mock };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({ url: '/test', method: 'GET' }),
      }),
    };
  });

  it('should handle HttpException with correct status and message', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not Found',
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
      }),
    );
  });

  it('should handle unknown error types gracefully', () => {
    const exception = new Error('Something went wrong');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle non-Error thrown values gracefully', () => {
    filter.catch('string error', mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should strip stack traces in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const exception = new Error('Production error');
    filter.catch(exception, mockHost as never);

    const sentBody = mockResponse.send.mock.calls[0][0];
    expect(sentBody.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const exception = new Error('Dev error');
    filter.catch(exception, mockHost as never);

    const sentBody = mockResponse.send.mock.calls[0][0];
    expect(sentBody.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include timestamp in response', () => {
    filter.catch(new Error('test'), mockHost as never);

    const sentBody = mockResponse.send.mock.calls[0][0];
    expect(sentBody.timestamp).toBeDefined();
    expect(new Date(sentBody.timestamp).getTime()).not.toBeNaN();
  });
});
