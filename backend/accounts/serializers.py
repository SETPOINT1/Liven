from rest_framework import serializers
from accounts.models import User


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    unit_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    project_id = serializers.UUIDField(required=False, allow_null=True)
    supabase_uid = serializers.UUIDField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('อีเมลนี้ถูกใช้งานแล้ว')
        return value

    def create(self, validated_data):
        return User.objects.create(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            unit_number=validated_data.get('unit_number', ''),
            project_id=validated_data.get('project_id'),
            supabase_uid=validated_data.get('supabase_uid'),
            role='resident',
            status='pending',
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'supabase_uid', 'email', 'full_name', 'phone',
            'unit_number', 'role', 'status', 'project_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class UserApprovalSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected', 'suspended'])


class RoleChangeSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['resident', 'juristic', 'developer'])
