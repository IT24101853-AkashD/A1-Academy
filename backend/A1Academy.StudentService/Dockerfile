# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY A1Academy.Shared/A1Academy.Shared.csproj A1Academy.Shared/
COPY A1Academy.Gateway/A1Academy.Gateway.csproj A1Academy.Gateway/
COPY A1Academy.AuthService/A1Academy.AuthService.csproj A1Academy.AuthService/
COPY A1Academy.AdminService/A1Academy.AdminService.csproj A1Academy.AdminService/
COPY A1Academy.TeacherService/A1Academy.TeacherService.csproj A1Academy.TeacherService/
COPY A1Academy.StudentService/A1Academy.StudentService.csproj A1Academy.StudentService/

RUN dotnet restore A1Academy.Gateway/A1Academy.Gateway.csproj
RUN dotnet restore A1Academy.AuthService/A1Academy.AuthService.csproj
RUN dotnet restore A1Academy.AdminService/A1Academy.AdminService.csproj
RUN dotnet restore A1Academy.TeacherService/A1Academy.TeacherService.csproj
RUN dotnet restore A1Academy.StudentService/A1Academy.StudentService.csproj

# Copy remaining source code and publish
COPY . .
RUN dotnet publish A1Academy.StudentService/A1Academy.StudentService.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime Environment
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "A1Academy.StudentService.dll"]

